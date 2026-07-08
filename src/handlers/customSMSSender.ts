import {
    buildClient,
    CommitmentPolicy,
    KmsKeyringNode,
} from "@aws-crypto/client-node";

const { decrypt } = buildClient(
    CommitmentPolicy.FORBID_ENCRYPT_ALLOW_DECRYPT
);

const keyArn =
    "arn:aws:kms:ap-south-1:485038482643:key/8801a3cb-af1e-48a9-be43-1b576431cfe7";

interface SendSmsParams {
    mobile: string;
    message: string;
    templateId?: string;
}

interface CognitoEvent {
    triggerSource: string;
    request: {
        code?: string;
        userAttributes: {
            phone_number: string;
        };
    };
    [key: string]: any;
}

const sendSms = async ({
    mobile,
    message,
    templateId,
}: SendSmsParams): Promise<any> => {
    console.log("[SEND_SMS_DISABLED]", {
        mobile,
        message,
        templateId,
    });
    
    return {
        success: true,
        disabled: true,
    };
};

const handleCustomSMSSender = async (
    event: CognitoEvent
): Promise<CognitoEvent> => {
    const SMS_TRIGGERS = [
        "CustomSMSSender_VerifyUserAttribute",
        "CustomSMSSender_UpdateUserAttribute",
    ];

    if (!SMS_TRIGGERS.includes(event.triggerSource)) {
        console.log(
            "[CustomSMSSender] Skipping —",
            event.triggerSource
        );
        return event;
    }

    if (!event.request.code) {
        console.error(
            "[CustomSMSSender] No code — KMS key may not be configured"
        );
        return event;
    }

    // Cognito encrypts the OTP using the AWS Encryption SDK.
    const keyring = new KmsKeyringNode({
        keyIds: [keyArn],
    });

    const { plaintext } = await decrypt(
        keyring,
        Buffer.from(event.request.code, "base64")
    );

    const otp = plaintext.toString("utf8");

    const mobile = event.request.userAttributes.phone_number.replace(
        /^\+/,
        ""
    );

    console.log(
        `[CustomSMSSender] Sending OTP to ${mobile}`
    );

    await sendSms({
        mobile,
        message: `Dear Applicant ,
Your One-Time Password , for verification is: ${otp}
Please do not share it with anyone.-Team BSSC
JTGLCC
Cyberica (CNTPL)`,
        templateId: "1207178152978600853",
    });

    return event;
};

export const handler = async (
    event: CognitoEvent
): Promise<CognitoEvent> => {
    console.log(
        "[messageTemplates] triggerSource:",
        event.triggerSource
    );

    if (event.triggerSource?.startsWith("CustomSMSSender_")) {
        return handleCustomSMSSender(event);
    }

    if (event.triggerSource?.startsWith("CustomMessage_")) {
        console.log(
            "[CustomMessage] triggerSource:",
            event.triggerSource
        );
        return event;
    }

    return event;
};
