if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([
	'jquery',
	'app/TilePlayer',
	'app/TileWorld',
	'app/tile/SquareTile'
], function(
	$,
	Player,
	TileWorld,
	SquareTile
) {
	return function() {
		//canvas
		var WIDTH = 800, HEIGHT = 600, isPaused = false;
		var canvas = $('<canvas width="' + WIDTH + 'px" height = "' + HEIGHT + 'px" />').appendTo(document.body);
		var ctx = canvas[0].getContext('2d');

		//create stuff
		var player = new Player(-1500, 0);
		var camera = { x: player.pos.x, y: player.pos.y };
		var tiles = new TileWorld();
		for(var i = -5; i <= 30; i++) {
			tiles.add(new SquareTile(tiles, -44, i));
		}
		tiles.add(new SquareTile(tiles, -41, -2));
		tiles.add(new SquareTile(tiles, -41, -1));
		tiles.add(new SquareTile(tiles, -41, 0));
		for(i = -40; i <= 1; i++) {
			tiles.add(new SquareTile(tiles, i, 1));
		}
		tiles.add(new SquareTile(tiles, 2, 0));
		tiles.add(new SquareTile(tiles, 3, 0));
		tiles.add(new SquareTile(tiles, 4, 0));
		tiles.add(new SquareTile(tiles, 5, -1));
		tiles.add(new SquareTile(tiles, 5, -3));
		tiles.add(new SquareTile(tiles, 5, -4));
		tiles.add(new SquareTile(tiles, 2, -4));
		tiles.add(new SquareTile(tiles, 2, -5));
		tiles.add(new SquareTile(tiles, 2, -6));
		tiles.add(new SquareTile(tiles, 2, -7));

		//add input bindings
		var keys = { pressed: {} };
		var KEY = { W: 87, A: 65, S: 83, D: 68, R: 82, P: 80, G: 71, SHIFT: 16, SPACE: 32 };
		var JUMP_KEY = KEY.SPACE;
		var PAUSE_KEY = KEY.P;
		$(document).on('keydown', function(evt) {
			if(!keys[evt.which]) {
				keys[evt.which] = true;
				keys.pressed[evt.which] = true;
				if(evt.which === PAUSE_KEY) {
					isPaused = !isPaused;
				}
				if(evt.which === JUMP_KEY) {
					player.jump();
				}
			}
		});
		$(document).on('keyup', function(evt) {
			if(keys[evt.which]) {
				keys[evt.which] = false;
				keys.pressed[evt.which] = false;
				if(evt.which === JUMP_KEY) {
					player.stopJumping();
				}
			}
		});

		//important stuff that happens every frame
		function tick(ms) {
			var i, j;

			//move the player
			player.setMoveDir(keys[KEY.A] ? -1 : (keys[KEY.D] ? 1 : 0), keys[KEY.W] ? -1 : (keys[KEY.S] ? 1 : 0));
			player.tick(ms);
			player.checkForCollisions(tiles);
		}

		function findInterruption(prohibitedInterruptionKey) {
			var interruptions = [];

			return interruptions[0] || null;
		}

		function render() {
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, WIDTH, HEIGHT);
			tiles.render(ctx, camera);
			player.render(ctx, camera);
		}

		function everyFrame(ms) {
			if(!isPaused) {
				tick(ms);
				camera.x = player.pos.x - WIDTH / 2;
				camera.y = player.pos.y - HEIGHT / 2;
			}
			render();
		}

		//set up animation frame functionality
		var prevTime;
		requestAnimationFrame(function(time) {
			prevTime = time;
			loop(time);
		});
		function loop(time) {
			var ms = time - prevTime;
			prevTime = time;
			everyFrame(ms, time);
			requestAnimationFrame(loop);
		}
	};
});