import { SubscriptionModel } from '../models/Subscription';
import { UserModel } from '../models/User';
import { PackageModel } from '../models/Package';
import { emailService } from '../config/email';

export interface NotificationPayload {
    packageId: string;
    version: string;
    message: string;
}

export class NotificationService {
    /**
     * Notify all subscribers of a package about a new version
     */
    static async notifySubscribers(packageId: string, version: string, message: string): Promise<void> {
        const subscriberIds = await SubscriptionModel.getSubscribersByPackage(packageId);

        if (subscriberIds.length === 0) {
            console.log(`No subscribers for package ${packageId}`);
            return;
        }

        // Get package details
        const pkg = await PackageModel.findById(packageId);
        const packageName = pkg?.name || packageId;

        console.log(`📢 Notifying ${subscriberIds.length} subscribers about ${packageId} v${version}`);

        // Send emails to all subscribers
        for (const userId of subscriberIds) {
            const user = await UserModel.findById(userId);
            if (user) {
                const { html, text } = emailService.generatePackageUpdateEmail(packageId, version, packageName);
                await emailService.sendEmail(user.email, `New Version: ${packageName} ${version}`, html, text);
            }
        }
    }

    /**
     * Notify about version update
     */
    static async notifyVersionUpdate(packageId: string, version: string): Promise<void> {
        await this.notifySubscribers(
            packageId,
            version,
            `New version ${version} of package ${packageId} is now available!`
        );
    }

    /**
     * Notify about version disable/discontinue
     */
    static async notifyVersionDisabled(packageId: string, version: string): Promise<void> {
        const subscriberIds = await SubscriptionModel.getSubscribersByPackage(packageId);

        console.log(`📢 Notifying ${subscriberIds.length} subscribers about ${packageId} v${version} being disabled`);

        for (const userId of subscriberIds) {
            const user = await UserModel.findById(userId);
            if (user) {
                const { html, text } = emailService.generateVersionDisabledEmail(packageId, version);
                await emailService.sendEmail(user.email, `Version Disabled: ${packageId} ${version}`, html, text);
            }
        }
    }

    /**
     * Notify about package discontinuation
     */
    static async notifyPackageDiscontinued(packageId: string): Promise<void> {
        const subscriberIds = await SubscriptionModel.getSubscribersByPackage(packageId);

        console.log(`📢 Notifying ${subscriberIds.length} subscribers about discontinuation of ${packageId}`);

        for (const userId of subscriberIds) {
            const user = await UserModel.findById(userId);
            if (user) {
                const { html, text } = emailService.generatePackageDiscontinuedEmail(packageId);
                await emailService.sendEmail(user.email, `Package Discontinued: ${packageId}`, html, text);
            }
        }
    }
}
