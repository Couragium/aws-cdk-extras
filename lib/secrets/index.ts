import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import { Stack } from '@aws-cdk/core';

/**
 * The type for creating a new secret from an existing secret and a template.
 * 
 * One of secretARN or secret must be provided.
 * 
 * secretKeys is a list of keys to extract from the previous secret.
 * 
 * template is a string of the form 'something{}somethingelse' where "{}" indicates
 * the position where the value of the previous secret keys are to be inserted.
 */
interface DerivedSecret {
    secretARN?: string,
    secret?: secretsmanager.ISecret,
    secretKeys: string[],
    template: string,
}

/**
 * A class with auxiliary methods for working with Secrets
 */
export abstract class Secrets {

    /**
     * A string containing characters to be excluded from a secret string
     * allowing it to be included in a URI without encoding.
     */
    public static readonly URI_SAFE_PASSWORD_EXCLUDE_CHARS = " %+~`#$&*()|[]{}:;<>?!'/@\"\\,.=^";

    /**
     * Creates a secret string that can be included in an URI without encoding.
     * 
     * @param stack A CDK stack
     * @param name The name of the new secret
     * 
     * @returns An SM secret
     */
    public static createURISafeSecret(stack: Stack, name: string): secretsmanager.ISecret {

        const secret = new secretsmanager.Secret(stack, name, {
            secretName: name,
            generateSecretString: {
                excludeCharacters: Secrets.URI_SAFE_PASSWORD_EXCLUDE_CHARS,
            },
        });

        return secret;

    }

    /**
     * Creates a new secret from an existing secret object and a template
     * 
     * @warning Use with extreme precaution
     * 
     * @param stack A CDK Stack
     * @param name The name of the new secret
     * @param props The current secret, the keys to be extracted from the current secret and the template
     * 
     * @returns An SM secret
     */
    public static createDerivedSecret(stack: Stack, name: string, props: DerivedSecret): secretsmanager.ISecret {

        let originalSecret: secretsmanager.ISecret;

        if (props.secretARN) {

            originalSecret = secretsmanager.Secret.fromSecretCompleteArn(
                stack, `SecretFromARN${name}`, props.secretARN
            );

        } else if (props.secret) {

            originalSecret = props.secret;

        } else {

            throw new Error('Either secret or secretARN is required');

        }

        let r = props.template;

        props.secretKeys.forEach(k => {
            const s = originalSecret.secretValueFromJson(k) as unknown as string;
            r = r.replace('{}', s);
        });

        const secret = new secretsmanager.Secret(stack, name);

        const cfnSecret = secret.node.defaultChild as secretsmanager.CfnSecret;

        cfnSecret.generateSecretString = undefined;

        cfnSecret.secretString = r;

        cfnSecret.name = name;

        return secret;

    }

    /**
     * Create a DSN URI secret string from the default database credentials object
     * 
     * @param stack A CDK stack
     * @param secret Current database credentials secret
     * @param name The name of the new secret
     * 
     * @returns An SM secret
     */
    public static createDatabaseUriSecret(stack: Stack, secret: secretsmanager.ISecret, name: string): secretsmanager.ISecret {

        const uri = Secrets.createDerivedSecret(stack, name, {
            secret: secret,
            secretKeys: ['engine', 'username', 'password', 'host', 'port', 'dbname'],
            template: '{}://{}:{}@{}:{}/{}',
        });

        return uri;

    }

    /**
     * Create an STMP URI secret string from an existing secret with username and password
     * 
     * @param stack A CDK stack
     * @param secretARN The ARN of the current secret with the keys "username" and "password"
     * @param name The name of the new secret
     * 
     * @returns An SM secret
     */
    public static createSmtpUriSecret(stack: Stack, secretARN: string, name: string = 'SMTP-URI'): secretsmanager.ISecret {

        const host = `email-smtp.${stack.region}.amazonaws.com`;

        const port = 587;

        const secret = Secrets.createDerivedSecret(stack, name, {
            secretARN: secretARN,
            secretKeys: ['username', 'password'],
            template: `smtps://{}:{}@${host}:${port}`,
        });

        return secret;

    }

}
