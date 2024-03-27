export default function (req,res,next) {
    res.locals.user = {
        userId: 1,
        email: 'user@example.com'
    }
    next()
}