import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as chime from 'cdk-amazon-chime-resources';
import { Construct } from 'constructs';
import path from 'path';
import url from 'url';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));

export class IvrWithChimeSdk extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id);

    const func = new NodejsFunction(this, 'NodejsFunction', {
      entry: path.join(__dirname, 'functions/index.ts'),
      depsLockFilePath: path.join(__dirname, 'functions/pnpm-lock.yaml'),
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(60),
    });
    func.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['chime:*'],
        resources: ['*'],
      })
    );

    const pstnPhoneNumber = new chime.ChimePhoneNumber(this, 'chime.ChimePhoneNumber', {
      phoneCountry: chime.PhoneCountry.CA,
      phoneProductType: chime.PhoneProductType.SMA,
      phoneNumberType: chime.PhoneNumberType.LOCAL,
    });

    const sipMediaApp = new chime.ChimeSipMediaApp(this, 'chime.ChimeSipMediaApp', {
      endpoint: func.functionArn,
    });

    new chime.ChimeSipRule(this, 'chime.ChimeSipRule', {
      triggerType: chime.TriggerType.TO_PHONE_NUMBER,
      triggerValue: pstnPhoneNumber.phoneNumber,
      targetApplications: [
        {
          priority: 1,
          sipMediaApplicationId: sipMediaApp.sipMediaAppId,
        },
      ],
    });

    new cdk.CfnOutput(this, 'pstnPhoneNumber', {
      value: pstnPhoneNumber.phoneNumber,
    });
  }
}

const app = new cdk.App();
new IvrWithChimeSdk(app, IvrWithChimeSdk.name, {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
