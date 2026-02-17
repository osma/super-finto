/**
 * Handles keyboard inputs for the game.
 */
export class InputHandler {
    constructor(game) {
        this.keys = new Set();
        this.game = game;

        window.addEventListener('keydown', (e) => {
            this.keys.add(e.key.toLowerCase());

            if (e.key.toLowerCase() === 'm' && this.game) {
                const isMuted = this.game.toggleMusic();
                console.log(isMuted ? "Music Muted" : "Music Playing");
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys.delete(e.key.toLowerCase());
        });
    }

    isPressed(key) {
        return this.keys.has(key.toLowerCase());
    }

    isMovingLeft() {
        return this.isPressed('ArrowLeft') || this.isPressed('a');
    }

    isMovingRight() {
        return this.isPressed('ArrowRight') || this.isPressed('d');
    }

    isJumping() {
        return this.isPressed('ArrowUp') || this.isPressed('w') || this.isPressed(' ') || this.isPressed('space');
    }

    isKneeling() {
        return this.isPressed('ArrowDown') || this.isPressed('s');
    }
}
