import * as qldb from '@aws-cdk/aws-qldb';

/**
 * This class contains auxiliary methods for working with QLDB ledgers
 */
export abstract class QLDB {

    /**
     * Returns the ARN for a ledger
     * 
     * @param ledger A QLDB ledger
     * 
     * @returns The ARN of the ledger 
     */
    public static getARN(ledger: qldb.CfnLedger): string {

        const region = ledger.stack.region;

        const account = ledger.stack.account;

        const ledgerName = ledger.name;

        const arn = `arn:aws:qldb:${region}:${account}:ledger/${ledgerName}`;

        return arn;

    }

}
