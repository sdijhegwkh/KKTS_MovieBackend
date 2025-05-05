const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  movie_id: { type: Number, required: true, unique: true }, // TMDb movie ID
  title: { type: String, required: true },
  overview: { type: String },
  poster_path: { type: String },
  runtime: { type: Number },
  genres: [{ type: String }],
  release_date: { type: Date },
  ticket_price: { type: Number, default: 90000 }, // Giá vé mặc định
  last_updated: { type: Date, default: Date.now },
});

movieSchema.index({ movie_id: 1 }); // Index cho movie_id
movieSchema.index({ genres: 1 }); // Index cho tìm kiếm theo thể loại
movieSchema.index({ title: 'text', overview: 'text' }); // Index cho tìm kiếm văn bản

const Movie = mongoose.model('Movie', movieSchema);

module.exports = Movie;