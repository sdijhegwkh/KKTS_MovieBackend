const express = require('express');
const axios = require('axios');
const Movie = require('../models/Movie');
const Booking = require('../models/Booking');

const router = express.Router();

const API_KEY = 'e9e9d8da18ae29fc430845952232787c';
const BASE_URL = 'https://api.themoviedb.org/3';
const LANGUAGE = 'vi-VN';
const MOVIE_LIMIT = 100;

// Convert TMDb genre IDs to genre names
const genreMap = {
  28: 'Phim Hành Động',
  12: 'Phim Phiêu Lưu',
  16: 'Phim Hoạt Hình',
  35: 'Phim Hài',
  80: 'Phim Hình Sự',
  99: 'Phim Tài Liệu',
  18: 'Phim Chính Kịch',
  10751: 'Phim Gia Đình',
  14: 'Phim Giả Tưởng',
  36: 'Phim Lịch Sử',
  27: 'Phim Kinh Dị',
  10402: 'Phim Nhạc',
  9648: 'Phim Bí Ẩn',
  10749: 'Phim Lãng Mạn',
  878: 'Phim Khoa Học Viễn Tưởng',
  10770: 'Phim Truyền Hình',
  53: 'Phim Gây Cấn',
  10752: 'Phim Chiến Tranh',
  37: 'Phim Miền Tây',
};

// Fetch movies with pagination and limit
const fetchMovies = async (endpoint, remainingLimit) => {
  let page = 1;
  let totalPages = 1;
  const allMovies = [];

  console.log(`Starting fetch for ${endpoint} with remaining limit: ${remainingLimit}`);
  while (page <= totalPages && allMovies.length < remainingLimit) {
    try {
      console.log(`Fetching ${endpoint} - Page ${page}`);
      const response = await axios.get(`${BASE_URL}/movie/${endpoint}`, {
        params: {
          api_key: API_KEY,
          language: LANGUAGE,
          page,
        },
      });

      const { results, total_pages } = response.data;
      console.log(`Fetched ${results.length} movies from ${endpoint} page ${page}, Total pages: ${total_pages}`);
      totalPages = total_pages;

      const moviesToAdd = results.slice(0, remainingLimit - allMovies.length);
      allMovies.push(...moviesToAdd);
      console.log(`Added ${moviesToAdd.length} movies. Current total: ${allMovies.length}`);
      page++;
      await new Promise((resolve) => setTimeout(resolve, 250)); // Delay to avoid rate limit
    } catch (error) {
      console.error(
        `Error fetching ${endpoint} page ${page}:`,
        error.response ? error.response.data : error.message
      );
      break;
    }
  }

  console.log(`Completed fetch for ${endpoint}. Total movies: ${allMovies.length}`);
  return allMovies;
};

// Fetch movie details (for runtime)
const fetchMovieDetails = async (movieId) => {
  try {
    console.log(`Fetching details for movie ID ${movieId}`);
    const response = await axios.get(`${BASE_URL}/movie/${movieId}`, {
      params: {
        api_key: API_KEY,
        language: LANGUAGE,
      },
    });
    console.log(`Fetched details for movie ID ${movieId}: Runtime ${response.data.runtime || 'N/A'}`);
    return response.data;
  } catch (error) {
    console.error(
      `Error fetching details for movie ${movieId}:`,
      error.response ? error.response.data : error.message
    );
    return {};
  }
};

// Route to create a new movie
router.post('/', async (req, res) => {
  try {
    const { movie_id, title, overview, genres, release_date, poster_path, runtime } = req.body;

    const movieData = {
      movie_id: Number(movie_id),
      title,
      overview: overview || '',
      genres,
      release_date: release_date ? new Date(release_date) : null,
      poster_path: poster_path || '',
      runtime: Number(runtime) || 0,
      ticket_price: 60000, // Default ticket price
      last_updated: new Date(),
    };

    const newMovie = new Movie(movieData);
    const savedMovie = await newMovie.save();

    res.status(201).json({
      id: savedMovie.movie_id,
      movieName: savedMovie.title,
      type: savedMovie.genres.join(', '),
      release_date: savedMovie.release_date,
      poster_path: savedMovie.poster_path,
      ticket_price: savedMovie.ticket_price,
    });
  } catch (error) {
    console.error('Error creating movie:', error.message, error.stack);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'ID phim đã tồn tại' });
    }
    res.status(500).json({ error: 'Failed to create movie' });
  }
});

// Route to fetch and save movies from TMDb
router.get('/fetch-movies', async (req, res) => {
  console.log('Endpoint /fetch-movies called');
  try {
    console.log(`Fetching now_playing movies with limit ${MOVIE_LIMIT}`);
    const nowPlayingMovies = await fetchMovies('now_playing', MOVIE_LIMIT);
    const remainingLimit = MOVIE_LIMIT - nowPlayingMovies.length;
    console.log(`Remaining limit after now_playing: ${remainingLimit}`);

    let upcomingMovies = [];
    if (remainingLimit > 0) {
      console.log(`Fetching upcoming movies with limit ${remainingLimit}`);
      upcomingMovies = await fetchMovies('upcoming', remainingLimit);
    } else {
      console.log('No remaining limit for upcoming movies');
    }

    const allMovies = [...nowPlayingMovies, ...upcomingMovies];
    console.log(`Total movies before deduplication: ${allMovies.length}`);
    const uniqueMovies = Array.from(
      new Map(allMovies.map((movie) => [movie.id, movie])).values()
    );
    console.log(`Total unique movies: ${uniqueMovies.length}`);

    for (const movie of uniqueMovies) {
      try {
        console.log(`Processing movie: ${movie.title} (ID: ${movie.id})`);
        const details = await fetchMovieDetails(movie.id);

        const genres = (movie.genre_ids || []).map((id) => genreMap[id]).filter(Boolean);
        console.log(`Genres for ${movie.title}: ${genres.join(', ')}`);

        const movieData = {
          movie_id: movie.id,
          title: movie.title || 'Unknown Title',
          overview: movie.overview || '',
          poster_path: movie.poster_path || '',
          runtime: details.runtime || 0,
          genres: genres.length > 0 ? genres : ['Unknown Genre'],
          release_date: movie.release_date ? new Date(movie.release_date) : null,
          ticket_price: 60000, // Default ticket price
          last_updated: new Date(),
        };

        console.log(`Saving/Updating movie: ${movie.title}`);
        const updatedMovie = await Movie.findOneAndUpdate(
          { movie_id: movie.id },
          movieData,
          { upsert: true, new: true }
        );
        console.log(`Successfully saved/updated movie: ${movie.title} (MongoDB ID: ${updatedMovie._id})`);
      } catch (error) {
        console.error(
          `Error saving movie ${movie.title || 'Unknown'}:`,
          error.message,
          error.stack
        );
      }
    }

    console.log('Completed fetching and saving movies');
    res.json({ message: 'Movies fetched and saved successfully', count: uniqueMovies.length });
  } catch (error) {
    console.error(
      'Error in /fetch-movies endpoint:',
      error.message,
      error.stack
    );
    res.status(500).json({ error: 'Failed to fetch and save movies' });
  }
});

// Route to get movies (for frontend)
router.get('/', async (req, res) => {
  console.log('Endpoint / called with query:', req.query);
  const { genre, search } = req.query;
  let query = {};

  if (genre) query.genres = genre;
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { overview: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    console.log(`Fetching movies from MongoDB with query: ${JSON.stringify(query)}`);
    const movies = await Movie.find(query).select('movie_id title genres release_date poster_path ticket_price');
    console.log(`Fetched ${movies.length} movies from MongoDB`);
    // Format data for frontend
    const formattedMovies = movies.map((movie) => ({
      id: movie.movie_id,
      movieName: movie.title || 'Unknown Title',
      type: movie.genres && movie.genres.length > 0 ? movie.genres.join(', ') : 'Unknown Genre',
      release_date: movie.release_date,
      poster_path: movie.poster_path,
      ticket_price: movie.ticket_price || 60000,
    }));
    console.log('Formatted movies:', formattedMovies);
    res.json(formattedMovies);
  } catch (error) {
    console.error(
      'Error fetching movies from MongoDB:',
      error.message,
      error.stack
    );
    res.status(500).json({ error: 'Failed to fetch movies' });
  }
});

// Route to get total number of movies
router.get('/stats', async (req, res) => {
  try {
    const totalMovies = await Movie.countDocuments();
    console.log(`Total movies counted: ${totalMovies}`);
    res.json({ totalMovies });
  } catch (error) {
    console.error('Error fetching stats:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Route to get top movies with tickets sold and revenue
router.get('/top', async (req, res) => {
  try {
    // Get all bookings and group by movieID to count tickets
    const ticketCounts = await Booking.aggregate([
      {
        $unwind: '$seats',
      },
      {
        $match: { 'seats.status': 'booked' },
      },
      {
        $group: {
          _id: '$movieID',
          ticketsSold: { $sum: 1 },
        },
      },
    ]);

    // Get all movies to include those with 0 tickets sold
    const movies = await Movie.find({}).select('movie_id title ticket_price');

    // Create top movies list
    const topMovies = movies.map((movie) => {
      const ticketData = ticketCounts.find((t) => t._id === movie.movie_id) || { ticketsSold: 0 };
      return {
        id: movie.movie_id,
        name: movie.title || 'Unknown Title',
        ticketsSold: ticketData.ticketsSold,
        revenue: ticketData.ticketsSold * (movie.ticket_price || 60000),
        ticketPrice: movie.ticket_price || 60000
      };
    });

    // Sort by tickets sold (descending)
    topMovies.sort((a, b) => b.ticketsSold - a.ticketsSold);

    console.log(`Fetched top movies: ${topMovies.length}`);
    res.json(topMovies);
  } catch (error) {
    console.error('Error fetching top movies:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch top movies' });
  }
});

// Route to update a movie
router.put('/:movie_id', async (req, res) => {
  try {
    const { movie_id } = req.params;
    const { title, genres, release_date, poster_path } = req.body;

    const movieData = {
      ...(title && { title }),
      ...(genres && { genres }),
      ...(release_date && { release_date: new Date(release_date) }),
      ...(poster_path && { poster_path: poster_path || '' }),
      last_updated: new Date(),
    };

    const updatedMovie = await Movie.findOneAndUpdate(
      { movie_id: Number(movie_id) },
      { $set: movieData },
      { new: true, runValidators: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({
      id: updatedMovie.movie_id,
      movieName: updatedMovie.title,
      type: updatedMovie.genres.join(', '),
      release_date: updatedMovie.release_date,
      poster_path: updatedMovie.poster_path,
      ticket_price: updatedMovie.ticket_price,
    });
  } catch (error) {
    console.error('Error updating movie:', error.message, error.stack);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'ID phim đã tồn tại' });
    }
    res.status(500).json({ error: 'Failed to update movie' });
  }
});

// Route to update ticket price
router.put('/:movie_id/price', async (req, res) => {
  try {
    const { movie_id } = req.params;
    const { ticket_price } = req.body;

    if (!ticket_price || ticket_price <= 0) {
      return res.status(400).json({ error: 'Giá vé không hợp lệ' });
    }

    const updatedMovie = await Movie.findOneAndUpdate(
      { movie_id: Number(movie_id) },
      { $set: { ticket_price: Number(ticket_price), last_updated: new Date() } },
      { new: true, runValidators: true }
    );

    if (!updatedMovie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({
      id: updatedMovie.movie_id,
      movieName: updatedMovie.title,
      type: updatedMovie.genres.join(', '),
      ticket_price: updatedMovie.ticket_price,
    });
  } catch (error) {
    console.error('Error updating ticket price:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to update ticket price' });
  }
});

// Route to delete a movie
router.delete('/:movie_id', async (req, res) => {
  try {
    const { movie_id } = req.params;
    const deletedMovie = await Movie.findOneAndDelete({ movie_id: Number(movie_id) });

    if (!deletedMovie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    console.error('Error deleting movie:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to delete movie' });
  }
});
router.get('/:movie_id/price', async (req, res) => {
  try {
    const { movie_id } = req.params;

    const movie = await Movie.findOne({ movie_id: Number(movie_id) }).select(
      'movie_id title genres ticket_price'
    );

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.json({
      id: movie.movie_id,
      movieName: movie.title || 'Unknown Title',
      type: movie.genres && movie.genres.length > 0 ? movie.genres.join(', ') : 'Unknown Genre',
      ticket_price: movie.ticket_price || 60000,
    });
  } catch (error) {
    console.error('Error fetching movie price:', error.message, error.stack);
    res.status(500).json({ error: 'Failed to fetch movie price' });
  }
});
router.put('/:id/price', async (req, res) => {
  try {
    const movieId = req.params.id;
    const { ticket_price } = req.body;

    // Validate input
    if (!ticket_price || ticket_price <= 0) {
      return res.status(400).json({ error: 'Ticket price must be a positive number' });
    }

    // Find and update the movie
    const movie = await Movie.findOneAndUpdate(
      { movie_id: movieId }, // Match by movie_id
      { ticket_price: Number(ticket_price), last_updated: new Date() },
      { new: true } // Return the updated document
    );

    if (!movie) {
      return res.status(404).json({ error: 'Movie not found' });
    }

    res.status(200).json({
      movie_id: movie.movie_id,
      title: movie.title,
      ticket_price: movie.ticket_price,
      last_updated: movie.last_updated,
    });
  } catch (error) {
    console.error('Error updating movie price:', error);
    res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
