import { Construct, Stack, StackProps } from '@aws-cdk/core';
import { Trail } from '@aws-cdk/aws-cloudtrail';
import { Repository } from '@aws-cdk/aws-ecr';
import { ContainerImage, Cluster } from '@aws-cdk/aws-ecs';
import { ApplicationLoadBalancedFargateService } from '@aws-cdk/aws-ecs-patterns';
import { FargateServiceContainerDeployPipeline } from '../pipeline';

interface FargateServiceFromContainerProps extends StackProps {
    serviceName: string,
    containerName: string,
    containerTag: string,
    cluster: Cluster,
    trail?: Trail,
}

export class FargateServiceFromContainerStack extends Stack {

    constructor(scope: Construct, id: string, props: FargateServiceFromContainerProps) {

        super(scope, id, props);

        new ApplicationLoadBalancedFargateService(
            this, props.serviceName, {
            cluster: props.cluster,
            serviceName: props.serviceName,
            taskImageOptions: {
                containerName: props.containerName,
                image: ContainerImage.fromEcrRepository(
                    new Repository(this, `${props.serviceName}Repository`, {
                        repositoryName: props.containerName,
                    }), props.containerTag
                ),
            },
        });

        new FargateServiceContainerDeployPipeline(this, `${props.serviceName}DeployPipeline`, {
            serviceName: props.serviceName,
            containerName: props.containerName,
            containerTag: props.containerTag,
            cluster: props.cluster,
        });

    }

}

new FargateServiceFromContainerStack(new Stack(), 'MyAppStack', {
    serviceName: 'MyApp',
    containerName: 'app',
    containerTag: 'development',
    cluster: undefined as any as Cluster,
});