import { Fn } from '@aws-cdk/core';

/**
 * This class contains methods that work with values that are resolved in deploy-time
 */
export abstract class Future {

    /**
     * Replaces a substring in a string once
     * 
     * @remark This method acts on tokens resolved in deploy-time
     * 
     * @param search The substring to be replaced
     * @param replace The replacement
     * @param subject The string that contains the sub-string
     *  
     * @returns A string with tokens and Fn functions
     */
    static replaceOnce(search: string, replace: string, subject: string): string {

        const split = Fn.split(search, subject, 2);

        const join = Fn.join(replace, [split[0], split[1]]);

        return join;

    }

}
