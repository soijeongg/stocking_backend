export default function isNotLogin(req, res, next) {
  if (!req.isAuthenticated()) {
    next();
  } else {
    return res.json({ message: '이미 로그인 된상태 입니다' });
  }
}
