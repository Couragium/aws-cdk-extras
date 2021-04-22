import * as elasticache from '@aws-cdk/aws-elasticache';
import { Future } from '../future';

/**
 * This class contains auxiliary methods for working with Elasticache's Memcached
 */
export abstract class Memcached {

    /**
     * Returns a node url from a cluster
     * 
     * @remark This value is resolved in deploy-time
     * 
     * @param cluster A Memcached cluster
     * 
     * @returns The url of the first node of the cluster 
     */
    public static getFirstNodeUrl(cluster: elasticache.CfnCacheCluster): string {

        const configUrl = `tcp://${cluster.attrConfigurationEndpointAddress}:11211`;

        const nodeUrl = Future.replaceOnce('.cfg.', '.0001.', configUrl);

        return nodeUrl;

    }

}
