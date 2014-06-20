if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([
	'jquery'
], function(
	$
) {
	return function() {
		//set up canvas
		var width = 800, height = 600;
		var canvas = $('<canvas width="' + width + 'px" height = "' + height + 'px" />').appendTo(document.body);
		var ctx = canvas[0].getContext('2d');

		//create circle (the player)
		var circle = {
			x: width / 2,
			y: height / 4,
			r: 20,
			vel: { x: 30, y: 0 },
			_prev: { x: width / 2, y: height / 4 },
			_force: { x: 0, y: 0 },
			_instantForce: { x: 0, y: 0 },
			_activeCollision: null,
			_wantsToJump: false,
			applyForce: function(forceX, forceY) {
				if(arguments.length === 4) {
					var force = arguments[1];
					var dirX = arguments[2];
					var dirY = arguments[3];
					var dir = Math.sqrt(dirX * dirX + dirY * dirY);
					forceX += force * dirX / dir;
					forceY += force * dirY / dir;
				}
				this._force.x += forceX;
				this._force.y += forceY;
			},
			applyInstantaneousForce: function(forceX, forceY) {
				if(arguments.length === 4) {
					var force = arguments[1];
					var dirX = arguments[2];
					var dirY = arguments[3];
					var dir = Math.sqrt(dirX * dirX + dirY * dirY);
					forceX += force * dirX / dir;
					forceY += force * dirY / dir;
				}
				this._instantForce.x += forceX;
				this._instantForce.y += forceY;
			},
			tick: function(ms, friction) {
				var t = ms / 1000;
				var oldVel = { x: this.vel.x, y: this.vel.y };
				this.vel.x += this._force.x * t + this._instantForce.x / 60;
				this.vel.y += this._force.y * t + this._instantForce.y / 60;
				this._force.x = 0;
				this._force.y = 0;
				this._instantForce.x = 0;
				this._instantForce.y = 0;
				this.vel.x *= friction;
				this.vel.y *= friction;
				//oldVel.x *= friction; //TODO see if it matters that we're not frictioning ret
				//oldVel.y *= friction; //TODO see if it matters that we're not frictioning ret
				this._prev.x = this.x;
				this._prev.y = this.y;
				this.x += (this.vel.x + oldVel.x * friction) / 2 * t;
				this.y += (this.vel.y + oldVel.y * friction) / 2 * t;
				return oldVel;
			}
		};

		//WASD to move the circle
		var allowedToJump = true;
		var keys = {};
		var KEY_MAP = { W: 87, A: 65, S: 83, D: 68, R: 82, SHIFT: 16, SPACE: 32 };
		$(document).on('keydown', function(evt) {
			keys[evt.which] = true;
			if(evt.which === KEY_MAP.SPACE && allowedToJump) {
				circle._wantsToJump = true;
				allowedToJump = false;
			}
		});
		$(document).on('keyup', function(evt) {
			keys[evt.which] = false;
			if(evt.which === KEY_MAP.SPACE) {
				circle._wantsToJump = false;
				allowedToJump = true;
			}
		});

		//click the canvas to create new obstacles
		var obstacles = [];
		var newLineEnd = null;
		var mouse = { x: 0, y: 0 };
		var timeOfMouseDown = 0;
		$(document).on('mousedown', function(evt) {
			timeOfMouseDown = Date.now();
			newLineEnd = { x: evt.clientX, y: evt.clientY };
		});
		$(document).on('mouseup', function(evt) {
			if(newLineEnd) {
				if(Date.now() - timeOfMouseDown < 110) {
					createPoint(newLineEnd.x, newLineEnd.y);
				}
				else {
					createLine(evt.clientX, evt.clientY, newLineEnd.x, newLineEnd.y);
				}
				timeOfMouseDown = 0;
				newLineEnd = null;
			}
		});
		$(document).on('mousemove', function(evt) {
			mouse.x = evt.clientX;
			mouse.y = evt.clientY;
		});
		var nextObstacleId = 0;
		function createLine(x1, y1, x2, y2, createPoints) {
			var angle = Math.atan2(y2 - y1, x2 - x1);
			var cosAngle = Math.cos(angle);
			var sinAngle = Math.sin(angle);
			var line = {
				id: nextObstacleId++,
				type: 'line',
				start: {
					x: x1,
					y: y1,
					rotated: {
						x: x1 * -cosAngle + y1 * -sinAngle,
						y: x1 * sinAngle + y1 * -cosAngle
					}
				},
				end: {
					x: x2,
					y: y2,
					rotated: {
						x: x2 * -cosAngle + y2 * -sinAngle,
						y: x2 * sinAngle + y2 * -cosAngle
					}
				},
				perpendicular: {
					x: sinAngle,
					y: -cosAngle
				},
				angle: angle,
				rotate: function(pos) {
					return {
						x: pos.x * -cosAngle + pos.y * -sinAngle,
						y: pos.x * sinAngle + pos.y * -cosAngle
					};
				},
				unrotate: function(pos) {
					return {
						x: pos.x * -cosAngle + pos.y * sinAngle,
						y: pos.x * -sinAngle + pos.y * -cosAngle
					};
				}
			};
			obstacles.push(line);
			if(createPoints !== false) {
				createPoint(x1, y1 [ line ]);
				createPoint(x2, y2 [ line ]);
			}
			return line;
		}
		function createPoint(x, y, parents) {
			var point = {
				id: nextObstacleId++,
				type: 'point',
				x: x,
				y: y,
				parentIds: (parents || []).map(function(p) { return p.id; })
			};
			obstacles.push(point);
			return point;
		}
		function createPoly(points) {
			var lines = [];
			for(var i = 0; i < points.length - 2; i += 2) {
				lines.push(createLine(points[i], points[i + 1], points[i + 2], points[i + 3], false));
			}
			lines.push(createLine(points[points.length - 2], points[points.length - 1], points[0], points[1]), false);
			for(i = 0; i < lines.length - 1; i++) {
				createPoint(lines[i].end.x, lines[i].end.y, [ lines[i], lines[i + 1] ]);
			}
			createPoint(lines[0].start.x, lines[0].start.y, [ lines[0], lines[lines.length - 1] ]);
		}

		//create starting lines
		createPoint(300, 300);
		createPoly([ 350,210,  450,210,  450,200,  350,200 ]);
		createPoly([ 525,350,  550,350,  550,100,  525,100 ]);

		function drawLine(x1, y1, x2, y2, color, thickness) {
			ctx.strokeStyle = color || '#000';
			ctx.lineWidth = thickness || 1;
			ctx.beginPath();
			ctx.moveTo(x1, y1);
			ctx.lineTo(x2, y2);
			var pipAngle = Math.atan2((x1 - x2), (y2 - y1));
			ctx.moveTo((x1 + x2) / 2, (y1 + y2) / 2);
			ctx.lineTo((x1 + x2) / 2 + 10 * Math.cos(pipAngle),
				(y1 + y2) / 2 + 10 * Math.sin(pipAngle));
			ctx.stroke();
		}
		function drawPoint(x, y, color, thickness) {
			ctx.fillStyle = color || '#000';
			ctx.beginPath();
			ctx.arc(x, y, (thickness || 3) / 2, 0, 2 * Math.PI, false);
			ctx.fill();
		}

		function checkForCollisionWithPoint(circle, point) {
			
		}

		function checkForCollisionWithLine(circle, line) {
			//transform circle to rotated coordinates
			var pos = line.rotate(circle);
			var vel = line.rotate(circle.vel);
			var prev = line.rotate(circle._prev);

			//circle can only collide if it's headed toward the line
			if(pos.y > prev.y) {
				//slope of circle's path
				var slope = (pos.y - prev.y) / (pos.x - prev.x); //can be Infinity

				//find collision point if circle were to intersect bulk of the line
				var intersectingEndPoint = false;
				var posOnHit = {
					x: pos.x + (line.start.rotated.y - circle.r - pos.y) / slope,
					y: line.start.rotated.y - circle.r
				};
				var contactPoint = {
					x: posOnHit.x,
					y: posOnHit.y + circle.r
				};

				//if that collision point is not actually on the line segment, then it's not colliding!
				if(line.start.rotated.x < posOnHit.x || posOnHit.x < line.end.rotated.x) {
					return false;
				}
				else {
					//collisions directly on the line sement are easy-peasy to handle
					vel.y = 0;
				}

				//determine if collision point is on the current path (have to account for a bit of error here, hence the 0.005)
				if(((prev.x - 0.005 <= posOnHit.x && posOnHit.x <= pos.x + 0.005) ||
					(pos.x - 0.005 <= posOnHit.x && posOnHit.x <= prev.x + 0.005)) &&
					(prev.y - 0.005 <= posOnHit.y && posOnHit.y <= pos.y + 0.005) &&
					pos.y > posOnHit.y) {
					//need to determine which collision happened first--we can do that by looking at how far it went before colliding
					var squareDistTraveledPreContact = (posOnHit.x - prev.x) * (posOnHit.x - prev.x) + (posOnHit.y - prev.y) * (posOnHit.y - prev.y);

					//there was a collision!
					return {
						obstacle: line,
						pointOfContact: line.unrotate(contactPoint), //unused
						posDuringContact: line.unrotate(posOnHit),
						posAfterContact: line.unrotate({ x: pos.x, y: posOnHit.y }),
						velAfterContact: line.unrotate(vel),
						squareDistTraveledPreContact: (posOnHit.x - prev.x) * (posOnHit.x - prev.x) + (posOnHit.y - prev.y) * (posOnHit.y - prev.y),
						isIntersectingEndPoint: intersectingEndPoint
					};
				}
			}
			return false;
		}

		function checkForCollisions() {
			var collision = null;
			for(var i = 0; i < obstacles.length; i++) {
				if(obstacles[i].type === 'line') {
					var collisionWithLine = checkForCollisionWithLine(circle, obstacles[i]);
					if(collisionWithLine && (!collision || collisionWithLine.squareDistTraveledPreContact < collision.squareDistTraveledPreContact)) {
						collision = collisionWithLine;
					}
				}
				else {
					//TODO
				}
			}
			return collision;
		}

		//do this all the time
		function everyFrame(ms) {
			moveStuff(ms);
			render();
		}

		var obstaclesCollidedWithLastFrame = [];
		function moveStuff(ms) {
			var t = ms / 1000, i;

			//apply gravity and user input
			circle.applyForce(0, 600);
			if(keys[KEY_MAP.A]) {
				circle.applyForce(-400, 0);
			}
			if(keys[KEY_MAP.D]) {
				circle.applyForce(400, 0);
			}
			if(circle._wantsToJump) {
				if(circle._activeCollision) {
					circle.applyInstantaneousForce(
						-15000 * circle._activeCollision.obstacle.perpendicular.x,
						-15000 * circle._activeCollision.obstacle.perpendicular.y);
				}
				circle._wantsToJump = false;
			}

			//apply sticky forces
			for(i = 0; i < obstaclesCollidedWithLastFrame.length; i++) {
				circle.applyForce(
					1 * obstaclesCollidedWithLastFrame[i].perpendicular.x,
					1 * obstaclesCollidedWithLastFrame[i].perpendicular.y);
			}

			//evaluate forces into movement
			var friction = Math.pow(Math.E, Math.log(1 - 0.3) * t);
			var oldVel = circle.tick(ms, friction);

			//check for collisions
			var numCollisions = 0;
			var numCollisionsPerObstacle = {};
			var obstaclesCollidedWithThisFrame = [];
			var collision = checkForCollisions();
			while(collision) {
				numCollisions++;
				circle._activeCollision = collision;
				if(!numCollisionsPerObstacle[collision.obstacle.id]) {
					obstaclesCollidedWithThisFrame.push(collision.obstacle);
					numCollisionsPerObstacle[collision.obstacle.id] = 0;
				}
				numCollisionsPerObstacle[collision.obstacle.id]++;
				/*if(numCollisionsPerObstacle[collision.line.id] >= 3) {
					circle.x = prevCollision.posDuringContact.x;
					circle.y = prevCollision.posDuringContact.y;
					break;
				}*/
				circle.x = collision.posAfterContact.x;
				circle.y = collision.posAfterContact.y;
				circle._prev.x = collision.posDuringContact.x;
				circle._prev.y = collision.posDuringContact.y;
				circle.vel.x = collision.velAfterContact.x;
				circle.vel.y = collision.velAfterContact.y;
				collision = checkForCollisions();
			}
			if(numCollisions === 0) {
				circle._activeCollision = null;
			}
			obstaclesCollidedWithLastFrame = obstaclesCollidedWithThisFrame;

			//keep player in bounds
			if(circle.x > width + circle.r / 2) {
				circle.x = -circle.r / 2;
			}
			else if(circle.x < -circle.r / 2) {
				circle.x = width + circle.r / 2;
			}
			if(circle.y > height + circle.r / 2) {
				circle.y = -circle.r / 2;
			}
			else if(circle.y < -circle.r / 2) {
				circle.y = height + circle.r / 2;
			}
		}

		function render() {
			//draw background
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, width, height);

			//draw lines
			for(i = 0; i < obstacles.length; i++) {
				if(obstacles[i].type === 'line') {
					drawLine(obstacles[i].start.x, obstacles[i].start.y, obstacles[i].end.x, obstacles[i].end.y);
				}
				else {
					drawPoint(obstacles[i].x, obstacles[i].y);
				}
			}

			//draw line being created
			if(newLineEnd) {
				drawLine(mouse.x, mouse.y, newLineEnd.x, newLineEnd.y, '#999');
			}

			//draw circle
			ctx.fillStyle = '#6c6';
			ctx.beginPath();
			ctx.arc(circle.x, circle.y, circle.r, 0, 2 * Math.PI, false);
			ctx.fill();

			//draw velocity vector
			ctx.strokeStyle = '#000';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(circle.x, circle.y);
			ctx.lineTo(circle.x + circle.vel.x / 5, circle.y + circle.vel.y / 5);
			ctx.stroke();
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