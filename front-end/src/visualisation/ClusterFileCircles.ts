import { Vector } from "../utils/MathUtils";

class FileClusterLocations {

    circleRadius: number;
    enlargedRadius: number;
    positionVectors: Vector[] = [];

    private root3: number = Math.sqrt(3);
    private lastInRing: number[] = [];
    private nextRing = 0;

    constructor(
        circleRadius?: number
    ) {
        this.circleRadius = circleRadius ?? 5;
        this.enlargedRadius = this.circleRadius * 1.5;
    }

    getPositionVector(position: number): Vector {
        if (this.positionVectors[position]) {
            // if the vector has already been calculated, apply it
            return this.positionVectors[position];
        }

        // recursively calling this method until the position is calculated, 
        // done so if multiple position vectors need adding to the dict, they can be added individually
        this.addNextPositionRing();
        return this.getPositionVector(position);

    }

    private addNextPositionRing() {
        if (this.nextRing === 0) {
            this.positionVectors.push(new Vector(0, 0));
        }

        let posy = false;
        let posx = true;

        for (let i = 0; i < 6; i++) {
            let segRoute: Vector;
            if (i % 3 === 0) {
                // direct
                segRoute = new Vector(2 * this.nextRing * this.circleRadius * (posx ? 1 : -1), 0);
            } else {
                // offset rules (for diagonals)
                segRoute = new Vector(this.nextRing * this.circleRadius * (posx ? 1 : -1), this.root3 * this.nextRing * this.circleRadius * (posy ? 1 : -1));
            }

            for (let j = 0; j < this.nextRing; j++) {
                if (j !== 0) {
                    // progressing to the next segment location
                    if (i !== 1 && i !== 4) {
                        // diagonal case
                        segRoute.x += (posy ? 1 : -1) * this.circleRadius;
                        segRoute.y += (posx ? -1 : 1) * this.circleRadius * this.root3;
                    } else {
                        // straight case
                        segRoute.x += (posy ? 1 : -1) * 2 * this.circleRadius;
                    }
                }
                this.positionVectors.push(segRoute.clone());
            }

            // moving posx and posy to the next position
            if (i === 1 || i === 4) {
                posx = !posx;
            }
            if (i === 2) {
                posy = !posy;
            }
        }

        this.lastInRing.push(this.positionVectors.length);
        this.nextRing += 1;
    }

    getPositionRingId(fileCount: number): number {
        if (fileCount === 0) {
            return 0;
        }
        
        if (fileCount > this.positionVectors.length) {
            this.addNextPositionRing();
            return this.getPositionRingId(fileCount);
        }

        for (let i = 0; i < this.lastInRing.length; i++) {
            if(this.lastInRing[i] >= fileCount) {
                return i + 1;
            }

        }

        return -1;
    }

    getCombinedCircleRadius(fileCount: number) {
        return this.getPositionRingId(fileCount) * this.circleRadius * 2;
    }

}


export default new FileClusterLocations();