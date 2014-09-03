if (typeof define !== 'function') { var define = require('amdefine')(module); }
define([
	'app/GeometryUtils'
], function(
	GeometryUtils
) {
	var GRAPPLE_SPEED = 1200;
	var K = 2000;
	function Grapple(player, dirX, dirY) {
		var dir = Math.sqrt(dirX * dirX + dirY * dirY);
		this._player = player;
		var x = this._player.pos.x + this._player.grappleOffset.x;
		var y = this._player.pos.y + this._player.grappleOffset.y;
		this.pos = { x: x, y: y };
		this.pos.prev = { x: x, y: y };
		this.vel = { x: GRAPPLE_SPEED * dirX / dir, y: GRAPPLE_SPEED * dirY / dir };
		this.isLatched = false;
		this._latchDist = null;
		this._isRetracting = false;
		this._recalculateMovementVectors();
	}
	Grapple.prototype.checkForCollisions = function(tiles) {
		var self = this;
		if(!this.isLatched) {
			tiles.forEach(function(tile) {
				var intersection = tile.box.isIntersectingLine(self._lineOfMovement);
				if(intersection) {
					self._latchTo(intersection.x, intersection.y);
				}
			});
		}
	};
	Grapple.prototype.move = function() {
		if(!this.isLatched) {
			this.pos.prev.x = this.pos.x;
			this.pos.prev.y = this.pos.y;
			this.pos.x += this.vel.x / 60;
			this.pos.y += this.vel.y / 60;
			this._recalculateMovementVectors();
		}
	};
	Grapple.prototype._latchTo = function(x, y) {
		if(!this.isLatched) {
			this.pos.x = x;
			this.pos.y = y;
			this.pos.prev.x = x;
			this.pos.prev.y = y;
			this.isLatched = true;
			var dx = x - this._player.pos.x;
			var dy = y - this._player.pos.y;
			this._latchDist = Math.sqrt(dx * dx + dy * dy);
			this._recalculateMovementVectors();
		}
	};
	Grapple.prototype._recalculateMovementVectors = function() {
		this._lineOfMovement = GeometryUtils.toLine(this.pos.prev, this.pos);
	};
	Grapple.prototype.applyForceToPlayer = function() {
		if(this.isLatched) {
			var dx = this._player.pos.x - this.pos.x;
			var dy = this._player.pos.y - this.pos.y;
			var dist = Math.sqrt(dx * dx + dy * dy);
			if(dist > this._latchDist) {
				var posX = this.pos.x + this._latchDist * dx / dist;
				var posY = this.pos.y + this._latchDist * dy / dist;
				var angle = Math.atan2(dy, dx);
				var cos = Math.cos(angle);
				var sin = Math.sin(angle);
				var velParallel = cos * this._player.vel.x + sin * this._player.vel.y;
				var velPerpendicular = -sin * this._player.vel.x + cos * this._player.vel.y;
				var velX = -sin * velPerpendicular;
				var velY = cos * velPerpendicular;
				this._player.restrictViaGrapplesTo(posX, posY, velX, velY);
			}
		}
	};
	Grapple.prototype.render = function(ctx, camera) {
		ctx.strokeStyle = '#444';
		ctx.lineWidth = 3;
		ctx.beginPath();
		ctx.moveTo(this._player.pos.x + this._player.grappleOffset.x - camera.x,
			this._player.pos.y + this._player.grappleOffset.y - camera.y);
		ctx.lineTo(this.pos.x - camera.x, this.pos.y - camera.y);
		ctx.stroke();
	};
	Grapple.prototype.startRetracting = function() {
		this._isRetracting = true;
	};
	Grapple.prototype.stopRetracting = function() {
		this._isRetracting = false;
	};
	return Grapple;
});