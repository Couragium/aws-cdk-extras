import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import * as codebuild from '@aws-cdk/aws-codebuild';
import { IRepository } from '@aws-cdk/aws-ecr';
import { FargateService } from '@aws-cdk/aws-ecs';
import { IRuleTarget } from '@aws-cdk/aws-events';
import { Stack } from '@aws-cdk/core';

interface FargateServiceContainerDeployPipelineProps {
    tag?: string,
    service: FargateService,
    serviceContainerName?: string,
    repository: IRepository,
    eventTargets?: IRuleTarget[],
}

export class FargateServiceContainerDeployPipeline {

    public readonly repository: IRepository;

    public readonly service: FargateService;

    public readonly pipeline: codepipeline.Pipeline;

    constructor(readonly stack: Stack, readonly name: string, props: FargateServiceContainerDeployPipelineProps) {

        this.repository = props.repository;

        this.service = props.service;

        const stages = this.getStages(
            props.serviceContainerName ||
            // @ts-ignore: containers property is protected
            this.service.taskDefinition.containers[0].containerName,
            props.tag || 'latest'
        );

        const pipeline = new codepipeline.Pipeline(stack, name, {
            pipelineName: name,
            stages: stages,
        });

        const state = pipeline.onStateChange(`${name}StateChange`);

        props.eventTargets?.forEach(t => state.addTarget(t));

        this.pipeline = pipeline;

    }

    private getStages(name: string, tag: string) {

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
                    CONTAINER_NAME: { value: name },
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
                        imageTag: tag,
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
