if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([
	'app/Grapple',
	'app/SpriteSheet',
	'app/Rect'
], function(
	Grapple,
	SpriteSheet,
	Rect
) {
	//variables to control how the player moves
	var GROUND_MOVEMENT = {
		TOP_SPEED: 250,
		MAX_SPEED: 1500,
		ACC: { INITIAL: 40, LESS: -20, NORMAL: -10, MORE: 20 },
		ACC_ABOVE_TOP_SPEED: { LESS: -4, NORMAL: -2, MORE: 0 }
	};
	var AIR_MOVEMENT = {
		TOP_SPEED: 500,
		MAX_SPEED: 1500,
		ACC: { INITIAL: 40, LESS: -2.5, NORMAL: -1, MORE: 2.5 },
		ACC_ABOVE_TOP_SPEED: { LESS: -2.5, NORMAL: -1, MORE: 0 }
	};
	//vertical movement variables
	var FALL_ACC = 20;
	var MAX_FALL_SPEED = 1500;
	var MAX_RISE_SPEED = 1500;
	var JUMP_SPEED = 600;
	var JUMP_STOP_SPEED = 200;
	//and wallcling jumping
	var WALLCLING_JUMP_SPEED = { LESS: { x: 75, y: 500 }, NORMAL: { x: 300, y: 475 }, MORE: { x: 350, y: 300 } };
	var WALLCLING_DROP_SPEED = { x: 50, y: 0 };
	var WALLCLING_STICKY_DURATION = 18;
	var WALLCLING_SLIDE_ACC = { LESS: 2, NORMAL: 2, MORE: 20 };
	var WALLCLING_SLIDE_DEC = 50;
	var WALLCLING_SLIDE_SPEED = { LESS: 125, NORMAL: 200, MORE: 1000 };
	var WALLCLING_OVERRIDE_SPEED = 1000;
	//collision box curiosities
	var HORIZONTAL_BOX_INSET_FROM_TOP = 5;
	var HORIZONTAL_BOX_INSET_FROM_BOTTOM = 5;
	var VERTICAL_BOX_INSET = 5;
	var ADDITIONAL_CLING_WIDTH = 1;
	var CLING_BOX_INSET_FROM_TOP = 9;
	var CLING_BOX_INSET_FROM_BOTTOM = 9;
	var CLING_BOX_WIDTHS = 3;
	var EDGE_HANG_BOX_HEIGHT = 1;
	//calculate max move amounts (for splitting frames)
	var MAX_HORIZONTAL_MOVEMENT_PER_FRAME = VERTICAL_BOX_INSET - 0.5;
	var MAX_UPWARD_MOVEMENT_PER_FRAME = HORIZONTAL_BOX_INSET_FROM_TOP - 0.5;
	var MAX_DOWNWARD_MOVEMENT_PER_FRAME = Math.max(CLING_BOX_INSET_FROM_TOP - EDGE_HANG_BOX_HEIGHT, HORIZONTAL_BOX_INSET_FROM_BOTTOM) - 0.5;
	function Player(x, y) {
		this.width = 22;
		this.height = 36;
		this.pos = { x: x, y: y }; //the upper left point of the player
		this.pos.prev = { x: x, y: y };
		this.vel = { x: 0, y: 0 };
		this._recalculateCollisionBoxes();
		this._isTryingToJump = false;
		this._isAirborne = true;
		this._spriteOffset = { x: -13, y: -10 };
		this._sprite = new SpriteSheet('/image/mailman-spritesheet.gif', 2, 24, 24);
		this._facing = 1;
		this._isWallClinging = false;
		this._isWallClingSliding = false;
		this._isEdgeHanging = false;
		this._isSwingingOnGrapple = false;
		this._framesSpentStickingToWall = 0;
		this.grappleOffset = { x: 11, y: 18 };
		this._currAnimation = null;
		this._currAnimationTime = 0;
	}
	Player.prototype._recalculateCollisionBoxes = function() {
		var x = this.pos.x, y = this.pos.y, w = this.width, h = this.height;
		var a = VERTICAL_BOX_INSET;
		var b = HORIZONTAL_BOX_INSET_FROM_TOP;
		var c = HORIZONTAL_BOX_INSET_FROM_BOTTOM;
		var d = ADDITIONAL_CLING_WIDTH;
		var e = CLING_BOX_INSET_FROM_TOP;
		var f = CLING_BOX_INSET_FROM_BOTTOM;
		var g = CLING_BOX_WIDTHS;
		var i = EDGE_HANG_BOX_HEIGHT;
		var q = 24; //how inset the horizontal cling detectors are
		this._boundingBox = new Rect(x - d, y - d, w + 2 * d, h + 2 * d, "rgba(0, 0, 0, 0.9)");
		this._topBox = new Rect(x + a, y, w - 2 * a, h / 2, "rgba(0, 255, 255, 0.9)");
		this._bottomBox = new Rect(x + a, y + h / 2, w - 2 * a, h / 2, "rgba(255, 0, 0, 0.9)");
		this._leftBox = new Rect(x, y + b, w / 2, h - b - c, "rgba(255, 255, 0, 0.9)");
		this._rightBox = new Rect(x + w / 2, y + b, w / 2, h - b - c, "rgba(0, 255, 0, 0.9)");
		if(this._facing === 1) {
			this._upperClingBox = new Rect(x + w / 2, y + e, w / 2 + d, g, "rgba(150, 0, 255, 1.0)");
			this._lowerClingBox = new Rect(x + w / 2, y + h - f - g, w / 2 + d, g, "rgba(150, 0, 255, 1.0)");
			this._edgeHangBox = new Rect(x + w / 2, y, w / 2 + d, i, "rgba(255, 255, 0, 1.0)");
		}
		else {
			this._upperClingBox = new Rect(x - d, y + e, w / 2 + d, g, "rgba(150, 0, 255, 1.0)");
			this._lowerClingBox = new Rect(x - d, y + h - f - g, w / 2 + d, g, "rgba(150, 0, 255, 1.0)");
			this._edgeHangBox = new Rect(x - d, y, w / 2 + d, i, "rgba(255, 255, 0, 1.0)");
		}
	};
	Player.prototype.planMovement = function(dirX, dirY) {
		this._moveDir = { x: dirX, y: dirY };
		var dir, speed, acc, dec, movement, isMovingAboveTopSpeed, maxSpeed;
		//while edge hanging we just do not move
		if(this._isSwingingOnGrapple) {
			this.vel.y += FALL_ACC;
		}
		else if(this._isEdgeHanging) {
			this.vel.x = 0;
			this.vel.y = 0;
			if(this._isTryingToJump) {
				this._facing *= -1;
				this._isTryingToJump = false;
				this._isEdgeHanging = false;
				//if you're holding down when you jump, you drop
				if(this._moveDir.y === 1) {
					this.vel.x = this._facing * WALLCLING_DROP_SPEED.x;
					this.vel.y = WALLCLING_DROP_SPEED.y;
				}
				//otherwise you jump in an arc determined by the direction you were holding
				else {
					dir = (this._moveDir.y === -1 ? -1 : this._facing * this._moveDir.x);
					this.vel.x = this._facing * choose(dir, WALLCLING_JUMP_SPEED).x;
					this.vel.y = -choose(dir, WALLCLING_JUMP_SPEED).y;
				}
			}
		}
		//when wallclinging, you stick to a wall for a bit and then slowly slide down it
		else if(this._isWallClinging) {
			this.vel.x = 0; //this shouldn't be necessary but we do it anways
			//you can walljump
			if(this._isTryingToJump) {
				this._facing *= -1;
				this._isTryingToJump = false;
				this._isWallClinging = false;
				//if you're holding down when you jump, you drop
				if(this._moveDir.y === 1) {
					this.vel.x = this._facing * WALLCLING_DROP_SPEED.x;
					this.vel.y = WALLCLING_DROP_SPEED.y;
				}
				//otherwise you jump in an arc determined by the direction you were holding
				else {
					dir = (this._moveDir.y === -1 ? -1 : this._facing * this._moveDir.x);
					this.vel.x = this._facing * choose(dir, WALLCLING_JUMP_SPEED).x;
					this.vel.y = -choose(dir, WALLCLING_JUMP_SPEED).y;
				}
			}
			//if you're just clinging to the wall
			else {
				//after a while of clinging, you start sliding
				if(this._framesSpentStickingToWall >= WALLCLING_STICKY_DURATION || this._moveDir.y === 1) {
					this._isWallClingSliding = true;
				}
				//when sliding you accelerate downwards slowly, while sticking you decelerate to 0
				speed = this._isWallClingSliding ? choose(this._moveDir.y, WALLCLING_SLIDE_SPEED) : 0;
				acc = this._isWallClingSliding ? choose(this._moveDir.y, WALLCLING_SLIDE_ACC) : WALLCLING_SLIDE_DEC;
				dec = WALLCLING_SLIDE_DEC;
				//if you're not sliding fast enough, accelerate to reach the target speed
				if(this.vel.y < speed) {
					this.vel.y += acc;
					if(this.vel.y > speed) {
						this.vel.y = speed;
					}
				}
				//if you're sliding too fast, decelerate to reach the target speed
				else if(this.vel.y > speed) {
					this.vel.y -= dec;
					if(this.vel.y < speed) {
						this.vel.y = speed;
					}
				}
				//it only counts as "sticking" if you're fully stopped while clinging to the wall
				if(this.vel.y === 0) {
					this._framesSpentStickingToWall++;
				}
			}
		}
		else {
			//you are always falling
			this.vel.y += FALL_ACC;

			//collect movement vars
			movement = (this._isAirborne ? AIR_MOVEMENT : GROUND_MOVEMENT);
			isMovingAboveTopSpeed = (this.vel.x > movement.TOP_SPEED || this.vel.x < -movement.TOP_SPEED);
			acc = (isMovingAboveTopSpeed ? movement.ACC_ABOVE_TOP_SPEED : movement.ACC);
			maxSpeed = (isMovingAboveTopSpeed ? movement.MAX_SPEED : movement.TOP_SPEED);

			//it's easy when you start moving
			if(this.vel.x === 0) {
				if(this._moveDir.x !== 0) {
					this._facing = this._moveDir.x;
					this.vel.x = this._moveDir.x * movement.ACC.INITIAL;
				}
			}

			//when you're already moving, you accelerate according to the direction held
			else {
				var dirOfVel = this.vel.x > 0 ? 1 : -1;
				var oldVelX = this.vel.x;
				this.vel.x += choose(dirOfVel * this._moveDir.x, acc) * dirOfVel;
				//if you switched directions and are holding a direction, you change facing
				if(this.vel.x !== 0 && this._moveDir.x !== 0) {
					if((oldVelX > 0) !== (this.vel.x > 0)) {
						this._facing = this._moveDir.x;
					}
					else if((this._moveDir.x > 0) === (this.vel.x > 0)) {
						this._facing = this._moveDir.x;
					}
				}
			}

			if(this._isAirborne) {
				if(this._moveDir.x !== 0) {
					this._facing = this._moveDir.x;
				}
			}

			//limt the player's speed
			if(this.vel.x > maxSpeed) {
				this.vel.x = maxSpeed;
			}
			else if(this.vel.x < -maxSpeed) {
				this.vel.x = -maxSpeed;
			}
		}
		if(this.vel.y > MAX_FALL_SPEED) {
			this.vel.y = MAX_FALL_SPEED;
		}
		if(this.vel.y < -MAX_RISE_SPEED) {
			this.vel.y = -MAX_RISE_SPEED;
		}

		//set the player's final move position for this timestep (may be altered by external forces)
		this._finalPos = { x: this.pos.x + this.vel.x / 60, y: this.pos.y + this.vel.y / 60 };
		this._isAirborne = true;
		this._isSwingingOnGrapple = false;
		this._remainingMoveIncrements = 100;
	};
	Player.prototype.hasMovementRemaining = function() {
		return this._remainingMoveIncrements > 0 && (this.pos.x !== this._finalPos.x || this.pos.y !== this._finalPos.y);
	};
	Player.prototype.move = function() {
		this._remainingMoveIncrements--;
		var dx = this._finalPos.x - this.pos.x;
		var dy = this._finalPos.y - this.pos.y;
		var percentOfMaxHorizontalMovement = Math.abs(dx) / MAX_HORIZONTAL_MOVEMENT_PER_FRAME;
		var percentOfMaxVerticalMovement = Math.abs(dy) / (dy > 0 ? MAX_DOWNWARD_MOVEMENT_PER_FRAME : MAX_UPWARD_MOVEMENT_PER_FRAME);
		var percentOfMaxMovement = Math.max(percentOfMaxHorizontalMovement, percentOfMaxVerticalMovement);
		if(percentOfMaxMovement > 1.0) {
			this.pos.x += dx / percentOfMaxMovement;
			this.pos.y += dy / percentOfMaxMovement;
		}
		else {
			this.pos.x = this._finalPos.x;
			this.pos.y = this._finalPos.y;
		}
		this._recalculateCollisionBoxes();
	};
	Player.prototype.checkForMaxTetherRange = function(grapples) {
		for(var i = 0; i < grapples.length; i++) {
			grapples[i].applyForceToPlayer();
		}
	};
	Player.prototype.checkForCollisions = function(tiles) {
		var self = this;
		if(this._isEdgeHanging) {
			return;
		}
		tiles.forEachNearby(this._boundingBox, function(tile) {
			if(self._topBox.isIntersecting(tile.box)) {
				self.vel.y = 0;
				self.pos.y = tile.box.y + tile.box.height;
				self._finalPos.y = self.pos.y;
				if(self._isWallClinging) {
					self._facing *= -1;
					self._isWallClinging = false;
				}
				self._recalculateCollisionBoxes();
			}
			if(self._bottomBox.isIntersecting(tile.box)) {
				self.vel.y = 0;
				self.pos.y = tile.box.y - self.height;
				self._finalPos.y = self.pos.y;
				if(self._isWallClinging) {
					self._facing *= -1;
					self._isWallClinging = false;
				}
				self._recalculateCollisionBoxes();
				self._isAirborne = false;
				if(self._isTryingToJump) {
					self._isTryingToJump = false;
					self.vel.y = -JUMP_SPEED;
				}
			}
		});
		tiles.forEachNearby(this._boundingBox, function(tile) {
			if(self._leftBox.isIntersecting(tile.box)) {
				self.vel.x = 0;
				self.pos.x = tile.box.x + tile.box.width;
				self._finalPos.x = self.pos.x;
				self._recalculateCollisionBoxes();
			}
			if(self._rightBox.isIntersecting(tile.box)) {
				self.vel.x = 0;
				self.pos.x = tile.box.x - self.width;
				self._finalPos.x = self.pos.x;
				self._recalculateCollisionBoxes();
			}
		});
		var isClingingToUpperClingBox = false;
		var isClingingToLowerClingBox = false;
		var edgeHangBoxCollision = false;
		var upperClingTile = null;
		tiles.forEachNearby(this._boundingBox, function(tile) {
			if(self._upperClingBox.isIntersecting(tile.box)) {
				isClingingToUpperClingBox = true;
				upperClingTile = tile;
			}
			if(self._lowerClingBox.isIntersecting(tile.box)) {
				isClingingToLowerClingBox = true;
			}
			if(self._edgeHangBox.isIntersecting(tile.box)) {
				edgeHangBoxCollision = true;
			}
		});
		if(isClingingToUpperClingBox && isClingingToLowerClingBox) {
			if(!this._isEdgeHanging && !this._isWallClinging && this.vel.y > -300 && this._isAirborne) {
				if(!edgeHangBoxCollision) {
					self._isEdgeHanging = true;
					self.pos.y = upperClingTile.box.y - EDGE_HANG_BOX_HEIGHT;
					self._finalPos.y = self.pos.y;
					self._recalculateCollisionBoxes();
				}
				else {
					self._isWallClinging = true;
					self._framesSpentStickingToWall = 0;
					self._isWallClingSliding = self._moveDir.y === 1 || (self.vel.y >= WALLCLING_OVERRIDE_SPEED);
				}
			}
		}
		else if(this._isWallClinging) {
			this._isWallClinging = false;
			this._facing *= -1;
			self._recalculateCollisionBoxes();
		}
		this._isTryingToJump = false;
	};
	Player.prototype.shootGrapple = function(x, y) {
		var dirX = x - this.pos.x - this.grappleOffset.x;
		var dirY = y - this.pos.y - this.grappleOffset.y;
		return new Grapple(this, dirX, dirY);
	};
	Player.prototype.jump = function() {
		this._isTryingToJump = true;
	};
	Player.prototype.stopJumping = function() {
		if(this.vel.y < -JUMP_STOP_SPEED) {
			this.vel.y = -JUMP_STOP_SPEED;
		}
	};
	Player.prototype._setAnimation = function(anim) {
		if(this._currAnimation !== anim) {
			this._currAnimation = anim;
			this._currAnimationTime	= 0;
		}
	};
	Player.prototype.restrictViaGrapplesTo = function(x, y, velX, velY) {
		this.pos.x = x;
		this.pos.y = y;
		this.pos.prev.x = x;
		this.pos.prev.y = y;
		this.vel.x = velX;
		this.vel.y = velY;
		this._isSwingingOnGrapple = true;
		this._recalculateCollisionBoxes();
	};
	Player.prototype.render = function(ctx, camera) {
		var frame, flip = this._facing < 0;
		var speed = this.vel.x < 0 ? -this.vel.x : this.vel.x;

		//edgehanging only has one animation
		if(this._isEdgeHanging) {
			this._setAnimation('hanging');
			frame = 91;
		}

		//wallclinging only has one animation
		else if(this._isWallClinging) {
			this._setAnimation('clinging');
			frame = 82; //clinging to the wall
		}

		//while airborne, frame is just determined by vertical velocity
		else if(this._isAirborne) {
			this._setAnimation('jumping');
			if(this.vel.y > 600) {
				frame = 73; //moving downward really fast
			}
			else if(this.vel.y > 100) {
				frame = 72; //moving downward
			}
			else if(this.vel.y > -300) {
				frame = 71; //moving upward
			}
			else {
				frame = 70; //moving upward really fast
			}
		}

		//there's a lot of different stuff that could be happening on the ground
		else {
			//if standing still
			if(speed === 0) {
				this._setAnimation('standing');
				if(this._moveDir.y === 1) {
					frame = 80; //crouching
				}
				else if(this._moveDir.y === -1) {
					frame = 83; //looking up
				}
				else {
					frame = 40; //just standing
				}
			}

			//if moving faster than the max walk speed
			else if(speed > GROUND_MOVEMENT.TOP_SPEED) {
				//normal skid animation when not pressing a direction
				if(this._moveDir.x === 0) {
					this._setAnimation('skidding');
					if((this._facing > 0) === (this.vel.x > 0)) {
						frame =  50; //skidding
					}
					else {
						frame =  64; //surfing
					}
				}

				//if pressing in the direction of movement, a multi-frame run animation is played
				else if((this._moveDir.x > 0) === (this.vel.x > 0)) {
					this._setAnimation('running');
					this._currAnimationTime = (this._currAnimationTime + speed / 600) % 20;
					if(this._currAnimationTime < 5) {
						frame = 60; //run 1
					}
					else if(this._currAnimationTime < 10) {
						frame = 61; //run 2
					}
					else if(this._currAnimationTime < 15) {
						frame = 62; //run 3
					}
					else {
						frame = 63; //run 4
					}
				}

				//if pressing the the direction opposite of movement, a multi-frame super skid animation is played
				else {
					this._setAnimation('super skidding');
					this._currAnimationTime = (this._currAnimationTime + 1) % 16;
					if((this._facing > 0) === (this.vel.x > 0)) {
						frame = this._currAnimationTime > 8 ? 52 : 53; //super-skid 1 / super-skid 2
					}
					else {
						frame = 55; //super-surf
					}
				}
			}

			//if walking (at or below the max walk speed)
			else {
				//if pressing in the direction opposite movement, display a turning animation
				if((this._moveDir.x > 0 && this.vel.x < 0) || (this._moveDir.x < 0 && this.vel.x > 0)) {
					this._setAnimation('turning');
					frame = 51; //turning
				}

				//otherwise display a multi-frame walking animation
				else {
					this._setAnimation('walking');
					this._currAnimationTime = (this._currAnimationTime + speed / 600) % 20;
					if(this._currAnimationTime < 6) {
						frame = 41; //walk 1
					}
					else if(this._currAnimationTime < 10) {
						frame = 42; //walk 2
					}
					else if(this._currAnimationTime < 16) {
						frame = 43; //walk 3
					}
					else {
						frame = 42; //walk 2 (repeated)
					}
				}
			}
		}

		//render the sprite
		this._sprite.render(ctx, camera, this.pos.x + this._spriteOffset.x, this.pos.y + this._spriteOffset.y, frame, flip);

		//debug rendering (hitboxes, velocity, etc)
		/*this._boundingBox.render(ctx, camera);
		this._topBox.render(ctx, camera);
		this._bottomBox.render(ctx, camera);
		this._leftBox.render(ctx, camera);
		this._rightBox.render(ctx, camera);
		this._upperClingBox.render(ctx, camera);
		this._lowerClingBox.render(ctx, camera);
		this._edgeHangBox.render(ctx, camera);
		ctx.strokeStyle = '#00f';
		ctx.lineWidth = 1;
		ctx.beginPath();
		ctx.moveTo(this.pos.x + this.width / 2 - camera.x,
			this.pos.y + this.height / 2 - camera.y);
		ctx.lineTo(this.pos.x + this.width / 2 - camera.x + this.vel.x / 5,
			this.pos.y + this.height / 2 - camera.y + this.vel.y / 5);
		ctx.stroke();
		ctx.fillStyle = '#000';
		ctx.font = '10px Georgia';
		ctx.fillText("vel.x=" + Math.round(this.vel.x), this.pos.x - camera.x, this.pos.y - camera.y - 15);
		ctx.fillText("vel.y=" + Math.round(this.vel.y), this.pos.x - camera.x, this.pos.y - camera.y - 5);*/
	};
	function choose(dir, option1, option2, option3) {
		if(dir < 0) {
			return arguments.length === 2 ? option1.LESS : option1;
		}
		else if(dir > 0) {
			return arguments.length === 2 ? option1.MORE : option3;
		}
		else {
			return arguments.length === 2 ? option1.NORMAL : option2;
		}
	}
	return Player;
});