const jwt = require('jsonwebtoken');

const SECRET_KEY = process.env.SECRET_KEY || "PASSKEY";

const authMiddleware = (req, res, next) => {
    const headers = req.headers.authorization;
    if (!headers) {
        return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = headers.startsWith("Bearer ") ? headers.split(" ")[1] : headers;
    try {
        const decode = jwt.verify(token, SECRET_KEY);
        req.user = decode;
        next();
    } catch (err) {
        return res.status(401).json({ message: "User token is invalid or expired" });
    }
};

const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== 'Admin') {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }
    next();
};

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.adminOnly = adminOnly;

