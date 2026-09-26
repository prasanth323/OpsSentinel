import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'ops_sentinel_super_secret_jwt_key_2025_prod_secure';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Missing Bearer token in Authorization header.'
    });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired session token. Please re-authenticate.'
      });
    }

    req.user = user;
    next();
  });
}
