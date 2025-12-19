### QyxVolcegineTos 火山云TOS存储上传
#### 使用方法
使用npm：
`npm install qyx-volcegine-tos --save`
使用yarn：
`yarn add qyx-volcegine-tos`
使用cdn：
`<script src="https://cdn.jsdelivr.net/npm/qyx-volcegine-tos@1.0.0/dist/qyx-volcegine-tos.min.js"></script>`
#### 响应结构
`{
    "code": 200,
    "data": {
        // 上传后的文件 url
        "url": "",
        // 文件后缀
        "suffix": "",
        // 分片上传的 uploadId
        "uploadId": "",
        // 原信息
        "meta": {}
    }
}`
#### 示例