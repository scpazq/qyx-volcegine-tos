# QyxVolcegineTos

[![npm version](https://img.shields.io/npm/v/qyx-volcegine-tos.svg)](https://www.npmjs.com/package/qyx-volcegine-tos)
[![license](https://img.shields.io/npm/l/qyx-volcegine-tos.svg)](./LICENSE)

一个用于在浏览器和 Node.js 环境中，便捷地上传文件至火山引擎对象存储（TOS）的客户端 SDK。

## 📦 安装

根据你的项目环境，选择以下一种方式安装：

**使用 npm:**

```
npm install qyx-volcegine-tos --save
```

**使用 yarn:**
```
yarn add qyx-volcegine-tos
```

**使用 CDN:**
```
<script src="https://cdn.jsdelivr.net/npm/qyx-volcegine-tos@0.0.3/dist/qyx-volcegine-tos.min.js"></script>
```

## 🚀 使用
**普通上传**
```
// 如果你通过包管理器安装并使用模块化开发
import QyxVolcegineTos from 'qyx-volcegine-tos';
// 或使用 CommonJS: const QyxVolcegineTos = require('qyx-volcegine-tos');

// 初始化实例 (请替换为你的真实配置)
const client = new QyxVolcegineTos({
  getOptions() => async () => {
  const result = await fetch("https://api.example.com/xxx").catch(() => {
            });
            return {
                // yourRegion填写Bucket所在地域。以华东1（杭州）为例，yourRegion填写为oss-cn-hangzhou。
                region: result.region,
                // 从STS服务获取的临时访问密钥（AccessKey ID和AccessKey Secret）。
                accessKeyId: result.accessKeyId,
                accessKeySecret: result.accessKeySecret,
                // 从STS服务获取的安全令牌（SecurityToken）。
                securityToken: result.securityToken,
                // 填写Bucket名称。
                bucket: result.bucket,
                // 填写域名地址
                endpoint: result.endpoint,
                // 填写 Bucket 所在地域。以华北2（北京)为例，"Provide your region" 填写为 cn-beijing。
                region: result.region,
                ...
            };
    }
});

// 执行上传
async function uploadFile() {
  try {
    // fileName 文件路径
    // file 文件
    // config 配置
    const result = await client.putObject(fileName, file, config);
    console.log('上传成功！', result);
  } catch (error) {
    console.error('上传失败:', error);
  }
}
```
**返回**
```
{
  "code": 200,
  "data": {
    "url": "https://bucket.region.tos.volces.com/path/to/file.jpg",
    "suffix": "jpg",
    "uploadId": "your-multipart-upload-id",
    "meta": {
      // 来自服务器或你上传时提供的原文件元信息
    }
  }
}
```
**断点续传**
```
async function multipartUpload() {
  try {
    const taskId = await client.addMultipartUpload(fileName, file, {
        progress: function(p, checkpoint) {}
    }
    );
    const result = await client.startUpload(taskId)
    console.log('上传成功！', result);
  } catch (error) {
    console.error('上传失败:', error);
  }
}

```
**断点续传暂停**
```
async function pauseUpload(taskId) {
    await client.pause(taskId)
}

```
**断点续传恢复**
```
async function resumeUpload(abortCheckpoint, file) {
  try {
    const taskId = await client.addMultipartUpload(abortCheckpoint.key, file, {
        checkpoint: abortCheckpoint,
        progress: function(p, checkpoint) {}
    }
    );
    const result = await client.startUpload(taskId)
    console.log('上传成功！', result);
  } catch (error) {
    console.error('上传失败:', error);
  }
}

```
**断点续传取消**
```
async function cancUpload(abortCheckpoint，taskId) {
    await client.cancel(abortCheckpoint.name, abortCheckpoint.uploadId, taskId)
}

```