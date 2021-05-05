import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as codebuild from '@aws-cdk/aws-codebuild';
import * as ecr from '@aws-cdk/aws-ecr';
import * as ecs from '@aws-cdk/aws-ecs';
import { IRuleTarget } from '@aws-cdk/aws-events';
import { Stack } from '@aws-cdk/core';

interface FargateServiceContainerDeployPipelineAttributes {
    name: string,
    serviceName: string,
    containerName: string,
    repositoryName: string,
    containerTag: string,
    cluster: ecs.Cluster,
}

interface FargateServiceContainerDeployPipelineProps {
    containerName: string,
    containerTag: string,
    service: ecs.IBaseService,
    repository: ecr.IRepository,
    eventTargets?: IRuleTarget[],
}

export class FargateServiceContainerDeployPipeline {

    public readonly repository: ecr.IRepository;

    public readonly service: ecs.IBaseService;

    public readonly pipeline: codepipeline.Pipeline;

    constructor(readonly stack: Stack, readonly name: string, props: FargateServiceContainerDeployPipelineProps) {

        this.repository = props.repository;

        this.service = props.service;

        const stages = this.getStages(
            this.service.serviceName, props.containerName, props.containerTag
        );

        const pipeline = new codepipeline.Pipeline(stack, name, {
            pipelineName: name,
            stages: stages,
        });

        const state = pipeline.onStateChange(`${name}StateChange`);

        props.eventTargets?.forEach(t => state.addTarget(t));

        this.pipeline = pipeline;

    }

    public static fromAttributes(stack: Stack, props: FargateServiceContainerDeployPipelineAttributes) {

        const repository = ecr.Repository.fromRepositoryName(
            stack, `${props.serviceName}Repository`, props.repositoryName
        );

        const service = ecs.FargateService.fromFargateServiceAttributes(
            stack, `${props.serviceName}FargateService`, {
            cluster: props.cluster,
            serviceName: props.serviceName,
        });

        const pipeline = new FargateServiceContainerDeployPipeline(stack, props.name, {
            containerName: props.containerName,
            containerTag: props.containerTag,
            service: service,
            repository: repository,
        });

        return pipeline;

    }

    private getStages(name: string, containerName: string, containerTag: string) {

        const sourceOutput = new codepipeline.Artifact(`${name}SourceOutput`);

        const buildOutput = new codepipeline.Artifact(`${name}BuildOutput`);

        const buildProject = new codebuild.PipelineProject(this.stack, `${name}PipelineProject`, {
            buildSpec: codebuild.BuildSpec.fromObject({
                version: '0.2',
                phases: {
                    prebuild: { commands: ['cat imageDetail.json'] },
                    build: {
                        commands: [
                            `jq -c --arg name "$CONTAINER_NAME" \
                            '[ { name: $name, imageUri: .ImageURI } ]' \
                            imageDetail.json > imagedefinitions.json`
                        ],
                    },
                    postbuild: { commands: ['cat imagedefinitions.json'] },
                },
                artifacts: {
                    files: [
                        'imagedefinitions.json'
                    ],
                    'discard-paths': 'yes',
                },
            }),
            environment: {
                buildImage: codebuild.LinuxBuildImage.STANDARD_5_0,
                environmentVariables: {
                    CONTAINER_NAME: { value: containerName },
                },
            },
        });

        const stages: codepipeline.StageProps[] = [
            {
                stageName: 'ContainerTagged',
                actions: [
                    new codepipeline_actions.EcrSourceAction({
                        actionName: `${name}SourceAction`,
                        repository: this.repository,
                        imageTag: containerTag,
                        output: sourceOutput,
                    }),
                ],
            },
            {
                stageName: 'ImageDefinition',
                actions: [
                    new codepipeline_actions.CodeBuildAction({
                        actionName: `${name}BuildAction`,
                        project: buildProject,
                        input: sourceOutput,
                        outputs: [buildOutput]
                    }),
                ],
            },
            {
                stageName: 'DeployService',
                actions: [
                    new codepipeline_actions.EcsDeployAction({
                        actionName: `${name}DeployAction`,
                        service: this.service,
                        input: buildOutput
                    }),
                ],
            },
        ];

        return stages;

    }

}
