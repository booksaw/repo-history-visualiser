
/**
 * Constants used when displaying users
 */
export class ContributorDisplayConstants {
    public static readonly fontSize = 15;
    public static readonly fontColor = "white"
    public static readonly profileWidth = 24;
    public static readonly profileHeight = 35;

    /**
     * Used to configure the canvas context to have the required details for user information
     * @param ctx The canvas contex 
     * @param globalScale The global scale
     */
    public static configureCtxToUser(ctx: CanvasRenderingContext2D, globalScale: number): void {
        ctx.font = (ContributorDisplayConstants.fontSize / globalScale) + "px Arial";
        ctx.fillStyle = ContributorDisplayConstants.fontColor;
    }

    /**
     * Function to get the dimensions that a profile picture should be displayed as
     * @param globalScale The global scale of the profile picture
     * @returns The required dimensions of the profile
     */
    public static getProfileDimensions(globalScale: number): { width: number, height: number } {
        return { width: ContributorDisplayConstants.profileWidth / globalScale, height: ContributorDisplayConstants.profileHeight / globalScale }
    }
}

export class CommitDateConstants {
    public static readonly fontSize = 25;
    public static readonly fontColor = "#BBBBBB";
    public static readonly bottomOffset = 20;

    /**
    * Used to configure the canvas context to have the required details for the date 
    * @param ctx The canvas contex 
    * @param globalScale The global scale
    */
    public static configureCtxToDate(ctx: CanvasRenderingContext2D, globalScale: number): void {
        ctx.font = (CommitDateConstants.fontSize / globalScale) + "px Arial";
        ctx.fillStyle = CommitDateConstants.fontColor;
    }

    public static getFormattedTime(date: Date): string {
        return date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear();
    }

    /**
     * Used to get the formatted time from UNIX Seconds 
     * @param date the date in UNIX Seconds 
     * @returns The formatted time
     */
    public static getFormattedTimeFromUNIXSeconds(date: number): string {
        const dateobj = new Date(0);
        dateobj.setUTCSeconds(date);
        return CommitDateConstants.getFormattedTime(dateobj);
    }
}

export class MilestoneConstants {
    public static readonly fontSize = 55;
    public static readonly fontColor = "#FFFFFF";
    public static readonly bottomOffset = 55;

    /**
    * Used to configure the canvas context to have the required details for milestones
    * @param ctx The canvas contex 
    * @param globalScale The global scale
    */
    public static configureCtxToMilestones(ctx: CanvasRenderingContext2D, globalScale: number): void {
        ctx.font = (MilestoneConstants.fontSize / globalScale) + "px Arial";
        ctx.fillStyle = MilestoneConstants.fontColor;
    }
}

export class FileKeyConstants {
    public static readonly fontSize = 12;
    public static readonly fontColor = "#FFFFFF";
    public static readonly topOffset = 10;
    public static readonly backgroundColor = "#383c44";
    public static readonly backgroundStrokeColor = "#484c54";
    public static readonly lineWidth = 1;

    /**
    * Used to configure the canvas context to have the required details for file key text
    * @param ctx The canvas contex 
    * @param globalScale The global scale
    */
    public static configureCtxToFileKey(ctx: CanvasRenderingContext2D, globalScale: number): void {
        ctx.fillStyle = FileKeyConstants.backgroundColor;
        ctx.strokeStyle = FileKeyConstants.backgroundStrokeColor;
        ctx.font = (FileKeyConstants.fontSize / globalScale) + "px Arial";
        ctx.lineWidth = FileKeyConstants.lineWidth / globalScale;
    }

}

export class EditLineConstants {
    public static readonly MODIFIED_COLOR = "orange";
    public static readonly ADDED_COLOR = "green";
    public static readonly DELETED_COLOR = "red";
}

export class StructureConstants {

    public static readonly lineWidth = 2;
    public static readonly fontColor = "white";
    public static readonly fontSize = 18;

    /**
    * Used to configure the canvas context to have the required details for structures
    * @param ctx The canvas contex 
    * @param globalScale The global scale
    */
    public static configureCtxToStructure(ctx: CanvasRenderingContext2D, outlineColor: string, backgroundColor: string): void {
        ctx.fillStyle = backgroundColor;
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = StructureConstants.lineWidth;
    }

    public static configureCtxToText(ctx: CanvasRenderingContext2D, globalScale: number): void {
        ctx.font = (StructureConstants.fontSize / globalScale) + "px Arial";
        ctx.fillStyle = StructureConstants.fontColor;
    }
}

export class FileLabelConstants {
    public static readonly lineWidth = 2;
    public static readonly fontColor = "white";
    public static readonly fontSize = 8;

    public static configureCtxToText(ctx: CanvasRenderingContext2D): void {
        ctx.font = (FileLabelConstants.fontSize) + "px Arial";
        ctx.fillStyle = FileLabelConstants.fontColor;
    }
}