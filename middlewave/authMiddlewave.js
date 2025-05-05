const jwt = require('jsonwebtoken');

const protectRoute = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if(!token){
        return res.status(401).json({message: "Không có token, quyền truy cập bị từ chối"});
    }
    

    try{
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }catch(err){
        console.log(err);
        
        return res.status(401).json({message: "Token không hợp lệ"});
    }
};

module.exports = {protectRoute}