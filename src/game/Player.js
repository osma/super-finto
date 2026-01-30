export class Player {
    constructor(game) {
        this.game = game;
        this.width = 40;
        this.height = 60;
        this.x = 100;
        this.y = this.game.height - this.height - 50;

        this.vx = 0;
        this.vy = 0;
        this.weight = 0.35; // Much slower gravity
        this.speed = 3;    // Slower horizontal movement
        this.jumpForce = 9; // Slower, lower jump
        this.friction = 0.9;
        this.grounded = false;

        // Visual properties
        this.color = '#f472b6'; // Pinkish accent
    }

    update(input) {
        // Kneeling logic
        const wasKneeling = this.isKneeling;
        this.isKneeling = input.isKneeling() && this.grounded;

        if (this.isKneeling && !wasKneeling) {
            this.height = 30;
            this.y += 30;
        } else if (!this.isKneeling && wasKneeling) {
            this.height = 60;
            this.y -= 30;
        }

        // Horizontal Movement
        if (this.isKneeling) {
            this.vx = 0;
        } else if (input.isMovingRight()) {
            this.vx = this.speed;
        } else if (input.isMovingLeft()) {
            this.vx = -this.speed;
        } else {
            this.vx *= this.friction;
        }
        this.x += this.vx;

        // Vertical Movement (Jump)
        if (!this.isKneeling && input.isJumping() && this.grounded) {
            this.vy = -this.jumpForce;
            this.grounded = false;
        }

        // Apply Gravity
        this.vy += this.weight;
        this.y += this.vy;

        // Screen Boundaries
        if (this.x < 0) this.x = 0;
    }

    draw(ctx) {
        const isFacingRight = this.vx >= 0;
        const pSize = 4; // Size of our "pixels"
        const pSizeY = this.isKneeling ? 2 : 4;

        ctx.save();

        // Pixel Art Grid Map (Simplified Mario-like)
        // 0: empty, 1: skin, 2: overall (blue), 3: shirt (red/cyan), 4: hat (blue), 5: boot (black), 6: eye/mustache (black)
        const frame = [
            [0, 0, 4, 4, 4, 4, 4, 0],
            [0, 4, 4, 4, 4, 4, 4, 4, 4],
            [0, 5, 5, 5, 1, 1, 6, 1],
            [5, 1, 5, 1, 1, 1, 6, 1, 1],
            [5, 1, 5, 5, 1, 1, 1, 6, 6, 6],
            [0, 0, 1, 1, 1, 1, 1, 1],
            [0, 0, 3, 3, 2, 3, 3, 0],
            [0, 3, 3, 3, 2, 3, 3, 3, 0],
            [3, 3, 3, 3, 2, 2, 2, 2, 2],
            [1, 1, 3, 2, 1, 2, 2, 1, 2],
            [1, 1, 1, 2, 2, 2, 2, 2, 2],
            [1, 1, 2, 2, 2, 2, 2, 2, 2],
            [0, 0, 2, 2, 2, 0, 2, 2],
            [0, 5, 5, 5, 0, 0, 5, 5, 5],
            [5, 5, 5, 5, 0, 0, 5, 5, 5, 5]
        ];

        const colors = {
            1: '#ffd4a3', // Skin
            2: '#2563eb', // Overalls (Blue)
            3: '#0ea5e9', // Shirt (Light Blue)
            4: '#1d4ed8', // Hat (Dark Blue)
            5: '#000000', // Boots/Detail
            6: '#1e293b'  // Eye/Mustache
        };

        const offsetX = this.x;
        const offsetY = this.y;

        frame.forEach((row, rowIndex) => {
            row.forEach((pixel, colIndex) => {
                if (pixel > 0) {
                    ctx.fillStyle = colors[pixel];
                    // Flip horizontal if facing left
                    const xPos = isFacingRight ? (colIndex * pSize) : (this.width - (colIndex + 1) * pSize);
                    ctx.fillRect(offsetX + xPos, offsetY + (rowIndex * pSizeY), pSize, pSizeY);
                }
            });
        });

        ctx.restore();
    }
}
