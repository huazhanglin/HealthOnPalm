export type LegalDocId = "privacy" | "terms";

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDocument {
  id: LegalDocId;
  title: string;
  meta: string;
  sections: LegalSection[];
}

const META =
  "版本 1.0.0 · 生效日期 2026年9月2日 · 提供者 Steven Lin";

const privacy: LegalDocument = {
  id: "privacy",
  title: "隐私政策",
  meta: META,
  sections: [
    {
      title: "1. 引言与适用",
      paragraphs: [
        "本政策说明 Steven Lin（下称「我们」）如何收集、使用、存储和分享您在使用 iOS 应用「掌握健康」（英文名 Health on Palm，简称 HOP）时的信息。",
        "本政策仅适用于已发布的 iOS App。未上线的其他端（例如微信小程序）不在范围内。",
        "重要：HOP 是个人健康与生活方式建议工具，不是医疗器械，不提供疾病诊断、处方或治疗方案，也不能替代执业医师的专业判断。",
      ],
    },
    {
      title: "2. 我们处理的信息",
      paragraphs: [
        "账号：电子邮箱。密码由认证服务（Supabase Auth）以哈希形式保存，我们不存储明文密码。",
        "健康档案：昵称、年龄、性别、身高、体重、职业（可选）、睡眠目标、运动偏好、头像。",
        "Apple 健康（HealthKit，只读）：在您授权后，读取活动（步数、距离、活动热量、基础代谢、锻炼分钟、站立）、睡眠分期、心率与心率变异、血氧、呼吸频率、体能相关指标，以及设备中的训练记录。我们不写入「健康」App，不读取临床病历、处方或实验室结果。",
        "您在 App 内记录的内容：运动打卡、手动睡眠、心情、对晨间简报的反馈。",
        "对话与语音：您发送给 HOP 助手的文字。若使用语音，录音会先转为文字再用于问答。",
        "技术信息：设备类型、App 版本，以及用于排查故障的有限日志。我们不使用广告追踪标识。",
      ],
    },
    {
      title: "3. 关于 HealthKit",
      paragraphs: [
        "读取 Apple「健康」数据仅用于：计算恢复参考、生成晨间简报与训练计划，以及为助手提供必要的个人上下文。",
        "您可在系统「健康」App 中随时关闭或缩小授权范围。我们不向广告平台提供 HealthKit 数据，不出售健康数据，也不将其用于保险核保或向雇主披露。",
        "关闭授权后，App 不再新同步。此前已同步的记录需通过「删除账号」申请清除。关闭 App 内授权不会自动撤销系统里的 HealthKit 许可。",
      ],
    },
    {
      title: "4. 我们如何使用这些信息",
      paragraphs: [
        "用于创建与维护账号、提供晨间简报、恢复参考、训练计划、记录与 HOP 助手，以及改进稳定性。",
        "我们不将上述信息用于个性化广告画像，不向保险公司或雇主提供您的健康数据。",
      ],
    },
    {
      title: "5. 第三方",
      paragraphs: [
        "Apple：提供 iOS、HealthKit 与 App Store。",
        "Supabase：托管账号认证、数据库与云函数。",
        "大模型与语音服务（如 SiliconFlow）：用于生成简报、训练计划、问答及语音识别与播报。我们会发送与问题相关的健康摘要或对话文本。提示词要求模型不提供诊断、处方或具体用药剂量。",
        "我们要求上述处理者不得将您的健康数据用于广告。",
      ],
    },
    {
      title: "6. 存储地点与期限",
      paragraphs: [
        "业务数据由 Supabase 在其云基础设施上托管，可能存储或处理于您所在国家或地区以外。",
        "账号存续期间保留提供服务所需的信息。删除账号后，我们将在三十日内从生产环境删除或匿名化相关个人数据；备份随常规周期覆盖。",
      ],
    },
    {
      title: "7. 未成年人",
      paragraphs: [
        "本服务面向成年人。我们不向 13 周岁以下儿童提供服务；若您位于中国大陆，则不向 14 周岁以下未成年人提供服务。",
      ],
    },
    {
      title: "8. 您的权利与删除账号",
      paragraphs: [
        "您可在 App「我的」页底部点「删除账号」申请删除，也可发邮件至 huazhang.lin@gmail.com 提出查阅、更正或删除请求。",
        "删除账号将清除登录凭证、档案、已同步健康摘要、运动 / 睡眠 / 心情、对话与计划缓存。不能代替您在系统「设置 → 健康」中关闭授权。",
      ],
    },
    {
      title: "9. 安全",
      paragraphs: [
        "传输使用 HTTPS；密码由认证服务哈希保存；HealthKit 仅在您授权范围内读取。请妥善保管账号密码。",
      ],
    },
    {
      title: "10. 政策变更",
      paragraphs: [
        "我们可能更新本政策并在本页更新日期与版本。重大变更时会尽量在 App 内提示。如不接受变更，请停止使用并删除账号。",
      ],
    },
    {
      title: "11. 联系我们",
      paragraphs: [
        "隐私相关请求：huazhang.lin@gmail.com。GitHub Issues 仅适合技术反馈，不作为删号或隐私请求的正式渠道。",
      ],
    },
  ],
};

const terms: LegalDocument = {
  id: "terms",
  title: "用户协议",
  meta: META,
  sections: [
    {
      title: "1. 服务说明",
      paragraphs: [
        "「掌握健康」（Health on Palm，HOP）由 Steven Lin 提供，根据您授权的健康数据与自行记录的信息，给出一般性、保守的生活方式与训练安排建议。",
        "使用本服务即表示您已阅读并同意本协议及《隐私政策》。",
      ],
    },
    {
      title: "2. 非医疗声明",
      paragraphs: [
        "HOP 不是医疗器械，不提供诊断、处方、用药剂量或治疗方案，也不能替代执业医师或医疗机构的专业意见。持续不适、指标异常或紧急症状请及时就医或拨打当地急救电话。",
      ],
    },
    {
      title: "3. 账号与安全",
      paragraphs: [
        "请使用有效电子邮箱注册并妥善保管密码。请勿将账号提供给他人。您保证所提交信息真实，且有权授权读取相应的 Apple 健康数据。",
      ],
    },
    {
      title: "4. 可接受的使用",
      paragraphs: [
        "您不得利用助手寻求具体处方或用药剂量，不得上传违法或恶意内容，不得在未满年龄要求时注册。我们可对滥用采取限制或终止服务的措施。",
      ],
    },
    {
      title: "5. 知识产权",
      paragraphs: [
        "App 的界面、文案与软件（除第三方许可内容外）由提供者享有相应权利。训练动作说明改编自 wger.de，遵循 CC BY-SA，应用内保留署名。",
      ],
    },
    {
      title: "6. 服务变更与删除账号",
      paragraphs: [
        "本服务目前免费。我们可能更新功能。您可在「我的」页底部申请删除账号，效果见《隐私政策》第 8 节。",
      ],
    },
    {
      title: "7. 免责",
      paragraphs: [
        "建议基于您提供的数据与一般性健康知识，可能不适用于您的具体情况。在适用法律允许的范围内，我们对因依赖建议、网络中断或第三方故障产生的间接损失不承担责任。",
      ],
    },
    {
      title: "8. 适用法律",
      paragraphs: [
        "本协议适用中华人民共和国大陆地区法律（不含冲突规范）。争议应先行协商；协商不成的，由提供者住所地有管辖权的人民法院管辖。",
      ],
    },
    {
      title: "9. 联系我们",
      paragraphs: ["协议与服务相关问题：huazhang.lin@gmail.com"],
    },
  ],
};

export function getLegalDocument(id: string | undefined): LegalDocument {
  return id === "terms" ? terms : privacy;
}

export function openLegalDocument(id: LegalDocId): void {
  uni.navigateTo({ url: `/pages/legal/index?doc=${id}` });
}
