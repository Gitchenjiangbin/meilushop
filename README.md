# 打包程序
```
electron-packager . MyApp --platform=win32 --arch=x64
```
# 代码中的debug 在测试的时候要改为true，打包的时候要改成false否则读取配置文件会有问题
```
// 打包的时候需要是false，否则配置文件读取不到
const debug = false
```