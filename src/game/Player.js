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
        this.speed = 2.0;
        this.acceleration = 0.2;
        this.jumpForce = 9.7; // Exactly 4 tiles max height
        this.maxFallSpeed = 10;
        this.friction = 0.9;
        this.grounded = false;
        this.lastJumpPressed = false;
        this.invulnerableTimer = 0;

        // Visual properties
        this.color = '#f472b6'; // Pinkish accent
        this.isBig = false;
        this.isKneeling = false;
        this.isDying = false;
        this.dieTimer = 0;
    }

    reset() {
        this.isBig = false;
        this.isKneeling = false;
        this.isDying = false;
        this.dieTimer = 0;
        this.width = 30;
        this.height = 40;
        this.vx = 0;
        this.vy = 0;
        this.invulnerableTimer = 0;
        this.grounded = false;
    }

    die() {
        if (this.isDying) return;
        this.isDying = true;
        this.dieTimer = 0;
        this.vy = -5; // Half of previous -10
        this.vx = 0;
        this.isBig = false;
        this.height = 40;
        this.width = 30;
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

    update(input, deltaTime) {
        if (this.isDying) {
            this.dieTimer++;
            this.vy += 0.0875; // Quarter of previous 0.35 to make it hang in air longer
            this.y += this.vy;
            return;
        }

        if (this.invulnerableTimer > 0) {
            this.invulnerableTimer = Math.max(0, this.invulnerableTimer - deltaTime);
        }

        // --- GROW (Parcel Collection) ---
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

    shrink() {
        if (!this.isBig) return;
        this.isBig = false;
        const oldHeight = this.height;
        this.width = 30; // Reset to small hitbox width
        this.height = 40; // Reset to small hitbox height

        // Correct position so feet stay grounded
        // If big and NOT kneeling, height was 80. (80-40) = 40.
        // If big AND kneeling, height was 40. (40-40) = 0.
        this.y += (oldHeight - this.height);

        this.invulnerableTimer = 3000; // 3 seconds
        console.log("Player shrunk and became invulnerable");
    }

    draw(ctx) {
        // Blinking Effect when invulnerable
        if (this.invulnerableTimer > 0 && Math.floor(Date.now() / 100) % 2 === 0) {
            return;
        }

        const isFacingRight = this.vx >= 0;
        const displayWidth = this.isBig ? 40 : 30;

        ctx.save();

        let frame;
        if (this.isBig) {
            // Big Elf - Side Profile, 20 cols x 40 rows (2x2px pixels)
            // Mario-like proportions: big head (~35%), body (~35%), legs (~30%)
            // 0=transparent 1=skin 2=tunic 3=belt 4=hair 5=boots 6=eyeWhite 7=outline 8=tunicLight
            frame = [
                // Hair (5 rows)
                [0, 0, 0, 0, 0, 0, 0, 7, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 0, 7, 4, 4, 4, 4, 4, 7, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 7, 4, 4, 4, 4, 4, 4, 4, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 4, 4, 4, 4, 4, 4, 4, 4, 4, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 7, 0, 0, 0, 0],
                // Face (8 rows)
                [0, 0, 0, 0, 7, 4, 1, 1, 1, 1, 1, 1, 1, 1, 1, 7, 0, 0, 0, 0],
                [0, 0, 7, 1, 7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 7, 0, 0, 0, 0],
                [0, 7, 1, 1, 7, 1, 1, 1, 1, 6, 6, 7, 1, 1, 1, 1, 7, 0, 0, 0],
                [7, 1, 1, 1, 7, 1, 1, 1, 1, 7, 7, 1, 1, 1, 1, 1, 7, 0, 0, 0],
                [0, 7, 1, 0, 7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 7, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 1, 1, 1, 1, 1, 1, 1, 1, 1, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 7, 1, 1, 1, 1, 1, 1, 1, 7, 0, 0, 0, 0, 0, 0],
                // Neck (1 row)
                [0, 0, 0, 0, 0, 0, 7, 1, 1, 1, 1, 7, 0, 0, 0, 0, 0, 0, 0, 0],
                // Shoulders/Chest (6 rows)
                [0, 0, 0, 0, 0, 7, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 8, 2, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 7, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0],
                [0, 0, 1, 7, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 1, 0, 0, 0, 0],
                [0, 0, 1, 7, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 1, 0, 0, 0, 0],
                [0, 0, 0, 7, 8, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0],
                // Belt (2 rows)
                [0, 0, 0, 7, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 7, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 7, 0, 0, 0, 0, 0],
                // Tunic skirt (6 rows)
                [0, 0, 0, 7, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 7, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 2, 2, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 2, 2, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 7, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 0, 7, 2, 2, 7, 7, 2, 2, 7, 0, 0, 0, 0, 0, 0, 0],
                // Legs (6 rows)
                [0, 0, 0, 0, 7, 1, 1, 1, 7, 0, 7, 1, 1, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 1, 1, 1, 7, 0, 7, 1, 1, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 1, 1, 1, 7, 0, 7, 1, 1, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 1, 1, 1, 7, 0, 7, 1, 1, 7, 0, 0, 0, 0, 0, 0],
                // Boots (6 rows)
                [0, 0, 0, 0, 7, 5, 5, 5, 7, 0, 7, 5, 5, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 5, 5, 5, 7, 0, 7, 5, 5, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 7, 5, 5, 5, 5, 7, 0, 7, 5, 5, 5, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 7, 5, 5, 5, 5, 7, 0, 7, 5, 5, 5, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 7, 5, 5, 5, 5, 0, 0, 7, 5, 5, 5, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 7, 5, 5, 5, 5, 0, 0, 7, 5, 5, 5, 0, 0, 0, 0, 0, 0],
            ];
        } else {
            // Small Elf - Side Profile, 15 cols x 20 rows (2x2px pixels)
            // Mario-like big head (~40%), body (~30%), legs (~30%)
            // 0=transparent 1=skin 2=tunic 3=belt 4=hair 5=boots 6=eyeWhite 7=outline 8=tunicLight
            frame = [
                // Hair (3 rows)
                [0, 0, 0, 0, 0, 7, 7, 7, 7, 0, 0, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 4, 4, 4, 4, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 7, 4, 4, 4, 4, 4, 4, 7, 0, 0, 0, 0],
                // Head/Face (5 rows)
                [0, 0, 0, 7, 4, 4, 4, 4, 4, 4, 4, 7, 0, 0, 0],
                [0, 7, 1, 7, 1, 1, 1, 1, 1, 1, 1, 7, 0, 0, 0],
                [7, 1, 1, 7, 1, 1, 6, 7, 1, 1, 1, 1, 7, 0, 0],
                [0, 7, 0, 7, 1, 1, 1, 1, 1, 1, 1, 7, 0, 0, 0],
                [0, 0, 0, 0, 7, 1, 1, 1, 1, 7, 0, 0, 0, 0, 0],
                // Body (6 rows)
                [0, 0, 0, 0, 7, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0],
                [0, 0, 0, 7, 8, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0],
                [0, 0, 1, 7, 8, 2, 2, 2, 2, 2, 7, 1, 0, 0, 0],
                [0, 0, 0, 7, 3, 3, 3, 3, 3, 3, 7, 0, 0, 0, 0],
                [0, 0, 0, 7, 2, 2, 2, 2, 2, 2, 7, 0, 0, 0, 0],
                [0, 0, 0, 0, 7, 2, 2, 2, 2, 7, 0, 0, 0, 0, 0],
                // Legs (3 rows)
                [0, 0, 0, 7, 1, 1, 7, 0, 7, 1, 1, 7, 0, 0, 0],
                [0, 0, 0, 7, 1, 1, 7, 0, 7, 1, 1, 7, 0, 0, 0],
                // Boots (3 rows)
                [0, 0, 0, 7, 5, 5, 7, 0, 7, 5, 5, 7, 0, 0, 0],
                [0, 0, 7, 5, 5, 5, 7, 0, 7, 5, 5, 5, 7, 0, 0],
                [0, 0, 7, 5, 5, 5, 7, 0, 7, 5, 5, 5, 7, 0, 0],
                [0, 0, 7, 5, 5, 5, 0, 0, 7, 5, 5, 5, 0, 0, 0],
            ];
        }

        const cols = frame[0].length;
        const rows = frame.length;
        const pSize = displayWidth / cols;
        const pSizeY = this.height / rows;

        const colors = {
            1: '#f5d0a9', // Skin
            2: '#1e3a8a', // Tunic (Dark Blue)
            3: '#d4a017', // Belt (Gold)
            4: '#c8a25c', // Hair (Dirty Blonde)
            5: '#5a3a1a', // Boots (Dark Brown)
            6: '#ffffff', // Eye white
            7: '#0f172a', // Outline (Near-black)
            8: '#2d4ea8', // Tunic highlight
        };

        // Center visual sprite on hitbox
        const offsetX = this.x - (displayWidth - this.width) / 2;
        let offsetY = this.y;

        if (this.isDying) {
            // Flip vertically
            ctx.translate(offsetX + displayWidth / 2, offsetY + this.height / 2);
            ctx.scale(1, -1);
            ctx.translate(-(offsetX + displayWidth / 2), -(offsetY + this.height / 2));
        }

        frame.forEach((row, rowIndex) => {
            row.forEach((pixel, colIndex) => {
                if (pixel > 0) {
                    ctx.fillStyle = colors[pixel];
                    const xPos = isFacingRight ? (colIndex * pSize) : (displayWidth - (colIndex + 1) * pSize);
                    ctx.fillRect(Math.floor(offsetX + xPos), Math.floor(offsetY + (rowIndex * pSizeY)), Math.ceil(pSize), Math.ceil(pSizeY));
                }
            });
        });

        ctx.restore();
    }
}
