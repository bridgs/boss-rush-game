requirejs.config({
	baseUrl: 'javascripts',
	paths: {
		lib: '/javascripts/lib',
		app: '/javascripts/app',
		jquery: '/javascripts/lib/jquery'
	}
});

requirejs([ 'app/Main5' ], function(Main) {
	Main();
});