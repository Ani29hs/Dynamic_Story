const jwt = require("jsonwebtoken");

const SECRET_KEY = process.env.SECRET_KEY || "PASSKEY";

// 1. AUTH MIDDLEWARE - Verifies JWT Bearer token on protected routes
const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: "User token is invalid or expired" });
    }
};

// 2. OPTIONAL AUTH - Decodes JWT if present, or falls back to body user info
const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
        const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
        try {
            const decoded = jwt.verify(token, SECRET_KEY);
            req.user = decoded;
            return next();
        } catch (error) {
            // Token invalid, fall through
        }
    }

    if (req.body && (req.body.userId || req.body.id)) {
        req.user = {
            id: req.body.userId || req.body.id,
            name: req.body.username || req.body.name || "Reader",
            role: req.body.role || "User"
        };
    }

    next();
};

// 3. ADMIN ONLY - Restricts route access strictly to Admin role
const adminOnly = (req, res, next) => {
    if (!req.user || req.user.role !== "Admin") {
        return res.status(403).json({ message: "Access denied. Admin privileges required." });
    }
    next();
};

// Export all middlewares
module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.optionalAuth = optionalAuth;
module.exports.adminOnly = adminOnly;
