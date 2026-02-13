export class Player {
    constructor(game) {
        this.game = game;
        this.width = 30;
        this.height = 40;
        this.x = 100;
        this.y = this.game.height - this.height - 40;

        this.vx = 0;
        this.vy = 0;
        this.weight = 0.28;
        this.speed = 2.5;
        this.acceleration = 0.3;
        this.jumpForce = 9.7; // Exactly 4 tiles max height
        this.maxFallSpeed = 10;
        this.friction = 0.9;
        this.grounded = false;
        this.lastJumpPressed = false;

        // Visual properties
        this.color = '#f472b6'; // Pinkish accent
        this.isBig = false;
    }

    grow() {
        if (this.isBig) return;

        this.isBig = true;
        this.width = 40;

        // If already kneeling, grow to half of big height
        if (this.isKneeling) {
            this.height = 40;
            this.y -= 20; // Was 20, now 40
        } else {
            this.height = 80;
            this.y -= 40; // Was 40, now 80
        }
    }

    update(input) {
        // Kneeling logic
        const wasKneeling = this.isKneeling;
        this.isKneeling = input.isKneeling() && this.grounded;

        if (this.isKneeling && !wasKneeling) {
            const hDiff = this.isBig ? 40 : 20;
            this.height -= hDiff;
            this.y += hDiff;
        } else if (!this.isKneeling && wasKneeling) {
            const hDiff = this.isBig ? 40 : 20;
            this.height += hDiff;
            this.y -= hDiff;
        }

        // Horizontal Movement with acceleration
        // Make it slightly faster and snappier in the air for better control
        const currentSpeed = this.isBig ? this.speed * 1.2 : this.speed;
        const currentAccel = this.grounded ? this.acceleration : this.acceleration * 1.5;
        const currentFriction = this.grounded ? this.friction : 0.98; // Less horizontal drag in air

        if (this.isKneeling) {
            this.vx = 0;
        } else if (input.isMovingRight()) {
            this.vx = Math.min(this.vx + currentAccel, currentSpeed);
        } else if (input.isMovingLeft()) {
            this.vx = Math.max(this.vx - currentAccel, -currentSpeed);
        } else {
            this.vx *= currentFriction;
        }
        this.x += this.vx;

        // Vertical Movement (Jump)
        const jumpPressed = input.isJumping();
        if (!this.isKneeling && jumpPressed && !this.lastJumpPressed && this.grounded) {
            this.vy = -(this.isBig ? this.jumpForce * 1.05 : this.jumpForce);
            this.grounded = false;
        }
        this.lastJumpPressed = jumpPressed;

        // Apply Gravity (Variable for jump control)
        let currentWeight = this.weight;
        if (this.vy < 0 && !jumpPressed) {
            currentWeight = this.weight * 8; // 8x gravity if button released early for 1-tile hop
        }
        this.vy = Math.min(this.vy + currentWeight, this.maxFallSpeed);
        this.y += this.vy;

        // Screen Boundaries
        if (this.x < 0) this.x = 0;
    }

    draw(ctx) {
        const isFacingRight = this.vx >= 0;
        const displayWidth = this.isBig ? 40 : 30;
        const pSize = displayWidth / 10; // Based on max columns in frame
        const pSizeY = this.height / (this.isBig ? 30 : 15); // Based on rows in frame

        ctx.save();

        let frame;
        if (this.isBig) {
            // Pixel Art Grid Map (Big Slender Elf - Side Profile)
            // Stretched to 30 rows
            frame = [
                [0, 0, 0, 4, 4, 4, 4, 0, 0], // Hair top
                [0, 0, 0, 4, 4, 4, 4, 4, 0], // Hair main
                [0, 0, 0, 4, 1, 1, 1, 1, 0], // Ear (back) / Forehead
                [0, 0, 0, 4, 1, 1, 6, 1, 0], // Eye
                [0, 0, 0, 4, 1, 1, 1, 1, 0], // Nose
                [0, 0, 0, 1, 1, 1, 1, 0, 0], // Chin/Neck
                [0, 0, 0, 2, 2, 2, 2, 0, 0], // Shoulders
                [0, 0, 2, 2, 2, 2, 2, 1, 0], // Chest + Arm/Hand forward
                [0, 0, 2, 2, 2, 2, 2, 0, 0], // Torso
                [0, 0, 2, 2, 2, 2, 2, 0, 0], // Torso Extended
                [0, 0, 2, 2, 2, 2, 2, 0, 0], // Torso Extended
                [0, 0, 2, 3, 3, 3, 2, 0, 0], // Belt
                [0, 0, 2, 2, 2, 2, 2, 0, 0], // Tunic Skirt
                [0, 0, 2, 2, 2, 2, 2, 0, 0], // Tunic Skirt Extended
                [0, 0, 2, 2, 2, 2, 2, 0, 0], // Tunic Skirt Extended
                [0, 0, 2, 2, 0, 0, 2, 0, 0], // Leg stride front
                [0, 0, 2, 2, 0, 0, 2, 0, 0], // Leg stride front Extended
                [0, 0, 2, 2, 0, 0, 2, 0, 0], // Leg stride front Extended
                [0, 0, 2, 2, 0, 5, 5, 0, 0], // Leg back / Boot front
                [0, 0, 2, 2, 0, 5, 5, 0, 0], // Leg back / Boot front Extended
                [0, 0, 2, 2, 0, 5, 5, 0, 0], // Leg back / Boot front Extended
                [0, 5, 5, 0, 0, 5, 5, 0, 0], // Boots
                [0, 5, 5, 0, 0, 5, 5, 0, 0]  // Boots bottom
            ];
            // Pad to 30 rows if needed or just let pSizeY handle the stretch.
            // Let's rely on pSizeY calculation above. Ideally height 80 / 30 = 2.66 px per block.
            // Our frame above is only 23 rows. Let's add more body/leg rows.
            // Actually, let's just reuse the small frame but maybe double some rows, or keep it simple
            // and just let pSizeY stretch it. However, the requirement is 40x80 size.
            // Let's create a distinct tall frame with 30 rows.
            frame = [
                // Head (6 rows)
                [0, 0, 0, 4, 4, 4, 4, 0, 0],
                [0, 0, 0, 4, 4, 4, 4, 4, 0],
                [0, 0, 0, 4, 1, 1, 1, 1, 0],
                [0, 0, 0, 4, 1, 1, 6, 1, 0],
                [0, 0, 0, 4, 1, 1, 1, 1, 0],
                [0, 0, 0, 1, 1, 1, 1, 0, 0],
                // Body (10 rows)
                [0, 0, 0, 2, 2, 2, 2, 0, 0],
                [0, 0, 0, 2, 2, 2, 2, 0, 0],
                [0, 0, 2, 2, 2, 2, 2, 1, 0],
                [0, 0, 2, 2, 2, 2, 2, 1, 0],
                [0, 0, 2, 2, 2, 2, 2, 0, 0],
                [0, 0, 2, 2, 2, 2, 2, 0, 0],
                [0, 0, 2, 3, 3, 3, 2, 0, 0],
                [0, 0, 2, 3, 3, 3, 2, 0, 0],
                [0, 0, 2, 2, 2, 2, 2, 0, 0],
                [0, 0, 2, 2, 2, 2, 2, 0, 0],
                // Legs (14 rows)
                [0, 0, 2, 2, 0, 0, 2, 0, 0],
                [0, 0, 2, 2, 0, 0, 2, 0, 0],
                [0, 0, 2, 2, 0, 0, 2, 0, 0],
                [0, 0, 2, 2, 0, 0, 2, 0, 0],
                [0, 0, 2, 2, 0, 0, 2, 0, 0],
                [0, 0, 2, 2, 0, 5, 5, 0, 0],
                [0, 0, 2, 2, 0, 5, 5, 0, 0],
                [0, 0, 2, 2, 0, 5, 5, 0, 0],
                [0, 0, 2, 2, 0, 5, 5, 0, 0],
                [0, 0, 2, 2, 0, 5, 5, 0, 0],
                [0, 5, 5, 0, 0, 5, 5, 0, 0],
                [0, 5, 5, 0, 0, 5, 5, 0, 0],
                [0, 5, 5, 0, 0, 5, 5, 0, 0],
                [0, 5, 5, 0, 0, 5, 5, 0, 0]
            ];
        } else {
            // Pixel Art Grid Map (Slender Elf - Side Profile) - 15 rows
            frame = [
                [0, 0, 0, 4, 4, 4, 4, 0, 0], // Hair top
                [0, 0, 0, 4, 4, 4, 4, 4, 0], // Hair main
                [0, 0, 0, 4, 1, 1, 1, 1, 0], // Ear (back) / Forehead
                [0, 0, 0, 4, 1, 1, 6, 1, 0], // Eye
                [0, 0, 0, 4, 1, 1, 1, 1, 0], // Nose
                [0, 0, 0, 1, 1, 1, 1, 0, 0], // Chin/Neck
                [0, 0, 0, 2, 2, 2, 2, 0, 0], // Shoulders
                [0, 0, 2, 2, 2, 2, 2, 1, 0], // Chest + Arm/Hand forward
                [0, 0, 2, 2, 2, 2, 2, 0, 0], // Torso
                [0, 0, 2, 3, 3, 3, 2, 0, 0], // Belt
                [0, 0, 2, 2, 2, 2, 2, 0, 0], // Tunic Skirt
                [0, 0, 2, 2, 0, 0, 2, 0, 0], // Leg stride front
                [0, 0, 2, 2, 0, 5, 5, 0, 0], // Leg back / Boot front
                [0, 5, 5, 0, 0, 5, 5, 0, 0], // Boots
                [0, 5, 5, 0, 0, 5, 5, 0, 0]  // Boots bottom
            ];
        }

        const colors = {
            1: '#ffe4c4', // Skin (Bisque)
            2: '#1e3a8a', // Tunic (Dark Blue)
            3: '#eab308', // Trim/Belt (Gold)
            4: '#facc15', // Hair (Blonde)
            5: '#78350f', // Boots (Brown)
            6: '#1e293b'  // Eye (Dark)
        };

        // Center visual sprite on hitbox
        const offsetX = this.x - (displayWidth - this.width) / 2;
        const offsetY = this.y;

        frame.forEach((row, rowIndex) => {
            row.forEach((pixel, colIndex) => {
                if (pixel > 0) {
                    ctx.fillStyle = colors[pixel];
                    // Flip horizontal if facing left
                    const xPos = isFacingRight ? (colIndex * pSize) : (displayWidth - (colIndex + 1) * pSize);
                    ctx.fillRect(Math.floor(offsetX + xPos), Math.floor(offsetY + (rowIndex * pSizeY)), pSize, pSizeY);
                }
            });
        });

        ctx.restore();
    }
}
