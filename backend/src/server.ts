import 'dotenv/config';
import app from './app';
import prisma from './utils/prisma';

const PORT = parseInt(process.env.PORT || '4000', 10);

async function main() {
  // 测试数据库连接
  await prisma.$connect();
  console.log('✅ 数据库连接成功');

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 OPC服务平台后端启动成功`);
    console.log(`   运行地址: http://0.0.0.0:${PORT}`);
    console.log(`   环境: ${process.env.NODE_ENV || 'development'}`);
  });
}

main().catch(async (err) => {
  console.error('❌ 启动失败:', err);
  await prisma.$disconnect();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
