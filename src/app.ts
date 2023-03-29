import * as cdk from 'aws-cdk-lib';
import { aws_lambda as lambda, aws_logs as logs } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

const ID = 'poc-ivr-twilio';

export class Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const func = new NodejsFunction(this, 'NodejsFunction', {
      functionName: ID,
      entry: path.join(__dirname, 'functions/index.ts'),
      depsLockFilePath: path.join(__dirname, 'functions/pnpm-lock.yaml'),
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(60),
      logRetention: logs.RetentionDays.ONE_WEEK,
      reservedConcurrentExecutions: 1,
    });

    new lambda.FunctionUrl(this, ' lambda.FunctionUrl', {
      function: func,
      authType: lambda.FunctionUrlAuthType.NONE,
    });
  }
}

const app = new cdk.App();
new Stack(app, ID, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
