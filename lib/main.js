var provider = require( './provider' )

module.exports = {
	activate: function() {
		provider.loadCompletions()
	},
	getProvider: function() {
		return provider
	}
}
