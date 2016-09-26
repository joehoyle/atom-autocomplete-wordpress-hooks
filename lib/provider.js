var fs = require( 'fs' )
var path = require( 'path' )

module.exports = {
	executablePath: 'php',

	// This will work on JavaScript and CoffeeScript files, but not in js comments.
	selector: '.source.php',
	disableForSelector: '.source.php .comment',

	// This will take priority over the default provider, which has a priority of 0.
	// `excludeLowerPriority` will suppress any providers with a lower priority
	// i.e. The default provider will be suppressed
	inclusionPriority: 1,
	excludeLowerPriority: false,
	loadCompletions: function() {
		this.filters = []
		this.actions = []

		var f = this.filters
		fs.readFile( path.resolve( __dirname, '..', 'hooks.json' ), (function(error, content) {
			var json = JSON.parse( content )

			for (var i = 0; i < json.length; i++) {
				var hook = json[i]
				if ( hook.type === 'action' ) {
					this.actions.push( hook )
				} else if ( hook.type === 'filter' ) {
					this.filters.push( hook )
				}
			}
		}).bind(this) )
	},

	getSuggestions: function(request) {

		if ( this.isInFilter( request ) ) {
			return this.filters.filter( function( filter ) {
				return filter.text.indexOf( request.prefix ) > -1
			}).map( this.getHookSuggestion )
		}

		if ( this.isInAction( request ) ) {
			return this.actions.filter( function( action ) {
				return action.text.indexOf( request.prefix ) > -1
			}).map( this.getHookSuggestion )
		}

		var isInHookArgsNumber = this.isInHookArgsNumber( request )

		if ( isInHookArgsNumber ) {
			var hook = this.getHook( isInHookArgsNumber[2] )

			if ( ! hook ) {
				return []
			}

			return [{
				text: String( hook.arguments.length )
			}]
		}

		var isInFunctionDecleration = this.isInFunctionDecleration( request )

		if ( isInFunctionDecleration ) {
			var hook = this.getHook( isInFunctionDecleration[2] )
			if ( ! hook ) {
				return []
			}

			var argsString = hook.arguments.map( function( arg ) { return arg.name } ) .join( ', ' )
			var stringAfterCursor = request.editor.getTextInRange([request.bufferPosition,[request.bufferPosition.row, request.bufferPosition.column+10]]).trim()
			var snippet = 'function (' + ( argsString ? ' ' + argsString + ' ' : '' ) + ') {\n\t$1\n}' + ( hook.arguments.length ? ', 10, ' + hook.arguments.length + ' ' : '' );

			if ( stringAfterCursor !== ')' ) {
				snippet += ');'
			}
			return [{
				snippet: snippet,
				description: 'Autocomplete hook closure'
			}]
		}
	},

	getHookSuggestion: function( hook ) {
		return {
			text: hook.text,
			description: hook.description,
			type: 'keyword',
			rightLabel: hook.arguments.map( function( arg ) { return arg.name } ).join( ' ' )
		}
	},

	getHook: function( name ) {
		var hooks = this.filters.filter( function( filter ) {
			return filter.text === name
		})

		if ( hooks.length == 0 ) {
			var hooks = this.actions.filter( function( action ) {
				return action.text === name
			})
		}

		if ( hooks.length ) {
			return hooks[0]
		}
	},

	isInFilter: function(request) {
		var line = request.editor.buffer.lines[ request.bufferPosition.row ].substr( 0, request.bufferPosition.column );
		return line.match( /(add|remove)_filter\([\s]*('|")[^"|']*$/ )
	},

	isInAction: function(request) {
		var line = request.editor.buffer.lines[ request.bufferPosition.row ].substr( 0, request.bufferPosition.column );
		return line.match( /(add|remove)_action\([\s]*('|")[^"|']*$/ )
	},

	isInFunctionDecleration: function(request) {
		var line = request.editor.buffer.lines[ request.bufferPosition.row ].substr( 0, request.bufferPosition.column );
		return line.match( /add_(filter|action)\([\s]*['|"]([\S]+?)['|"],[\s]*[\w]*?$/ )
	},

	isInHookArgsNumber: function(request) {
		var line = request.editor.buffer.lines[ request.bufferPosition.row ].substr( 0, request.bufferPosition.column );
		return line.match( /add_(filter|action)\([\s]*['|"]([\S]+?)['|"],[\s\S]*?,[\s\S]*?,\s*[\d]*$/ )
	}
}
