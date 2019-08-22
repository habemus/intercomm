const promiseTry = (fn, args) => {
	return new Promise((resolve, reject) => {
		try {
			resolve(fn.apply(null, args))
		} catch (err) {
			reject(err)
		}
	})
}

module.exports = promiseTry
