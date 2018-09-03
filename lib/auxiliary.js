/**
 * Calls toJSON on an object
 */
exports.toJSON = data => {
	return data && typeof data.toJSON === 'function' ?
		data.toJSON() :
		data
}
