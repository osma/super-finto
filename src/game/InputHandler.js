/**
 * Handles keyboard inputs for the game.
 */
export class InputHandler {
    constructor() {
        this.keys = new Set();

        window.addEventListener('keydown', (e) => {
            this.keys.add(e.key.toLowerCase());
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
}
