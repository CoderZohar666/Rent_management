<template>
  <div class="login-page">
    <div class="login-page__glow login-page__glow--blue"></div>
    <div class="login-page__glow login-page__glow--green"></div>
    <div class="login-page__grid">
      <section class="login-hero">
        <p class="login-hero__eyebrow">Rental OS</p>
        <h1>租房业务的简洁工作台</h1>
        <p class="login-hero__description">
          统一管理城市、项目、房间、合同、账单与提醒，让日常运营更清晰、更克制、更高效。
        </p>
        <div class="login-hero__highlights">
          <article class="login-highlight surface-panel">
            <strong>全流程</strong>
            <span>房源、租户、合同、账单与维修一体化协同</span>
          </article>
          <article class="login-highlight surface-panel">
            <strong>本地安全</strong>
            <span>数据默认保存在浏览器本地，适合单机轻量管理</span>
          </article>
          <article class="login-highlight surface-panel">
            <strong>清晰提醒</strong>
            <span>到期合同、逾期账单、待处理事项集中呈现</span>
          </article>
        </div>
      </section>

      <section class="login-panel surface-panel">
        <div class="login-panel__header">
          <div class="login-panel__badge">管理员入口</div>
          <h2>登录系统</h2>
          <p>请输入账号信息进入租房管理工作台。</p>
        </div>

        <el-form ref="formRef" :model="loginForm" :rules="rules" class="login-form">
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              size="large"
              :prefix-icon="User"
            />
          </el-form-item>
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          <el-form-item>
            <el-button class="login-form__submit" type="primary" size="large" :loading="loading" @click="handleLogin">
              登录
            </el-button>
          </el-form-item>
          <el-alert
            v-if="errorMsg"
            class="login-form__alert"
            :title="errorMsg"
            type="error"
            show-icon
            :closable="false"
          />
        </el-form>

        <div class="login-tips">
          <span>默认账号：`admin`</span>
          <span>默认密码：`admin123`</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { User, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import db from '@/utils/localDB'
import { addLog } from '@/utils/activity'

const router = useRouter()
const formRef = ref(null)
const loading = ref(false)
const errorMsg = ref('')

const loginForm = reactive({
  username: '',
  password: ''
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const handleLogin = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid) => {
    if (!valid) return

    loading.value = true
    errorMsg.value = ''
    await new Promise((resolve) => setTimeout(resolve, 500))

    const users = db.query('users', {
      username: loginForm.username,
      password: loginForm.password
    })

    if (users.length > 0) {
      const user = users[0]
      localStorage.setItem('auth_token', `token_${Date.now()}`)
      localStorage.setItem('user_info', JSON.stringify(user))
      addLog({ type: 'login', module: '登录', description: `${user.username} 登录系统` })
      ElMessage.success('登录成功')
      router.push('/')
    } else {
      errorMsg.value = '用户名或密码错误'
    }

    loading.value = false
  })
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  overflow: hidden;
}

.login-page__glow {
  position: absolute;
  border-radius: 999px;
  filter: blur(20px);
  opacity: 0.9;
}

.login-page__glow--blue {
  top: 8%;
  left: 6%;
  width: 320px;
  height: 320px;
  background: rgba(37, 99, 235, 0.08);
}

.login-page__glow--green {
  right: 8%;
  bottom: 8%;
  width: 280px;
  height: 280px;
  background: rgba(18, 185, 129, 0.08);
}

.login-page__grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(380px, 460px);
  align-items: center;
  gap: 40px;
  width: min(1180px, 100%);
}

.login-hero {
  padding: 16px 8px;
}

.login-hero__eyebrow {
  margin: 0 0 12px;
  color: var(--app-color-primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.login-hero h1 {
  margin: 0;
  max-width: 520px;
  font-size: 52px;
  line-height: 1.05;
  color: var(--app-color-text);
}

.login-hero__description {
  margin: 20px 0 0;
  max-width: 560px;
  color: var(--app-color-text-secondary);
  font-size: 17px;
  line-height: 1.8;
}

.login-hero__highlights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 32px;
}

.login-highlight {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px;
  min-height: 148px;
}

.login-highlight strong {
  font-size: 18px;
  color: var(--app-color-text);
}

.login-highlight span {
  color: var(--app-color-text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.login-panel {
  padding: 32px;
}

.login-panel__header {
  margin-bottom: 24px;
}

.login-panel__badge {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: var(--app-color-primary);
  font-size: 12px;
  font-weight: 700;
}

.login-panel__header h2 {
  margin: 16px 0 8px;
  font-size: 30px;
}

.login-panel__header p {
  margin: 0;
  color: var(--app-color-text-secondary);
}

.login-form {
  margin-top: 28px;
}

.login-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.login-form__submit {
  width: 100%;
  height: 48px;
}

.login-form__alert {
  margin-top: 8px;
}

.login-tips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid rgba(226, 232, 240, 0.9);
  color: var(--app-color-text-muted);
  font-size: 13px;
}

@media (max-width: 1279px) {
  .login-page__grid {
    grid-template-columns: 1fr;
  }

  .login-hero {
    padding-inline: 0;
  }

  .login-hero h1 {
    font-size: 42px;
  }
}

@media (max-width: 767px) {
  .login-page {
    padding: 18px;
  }

  .login-page__grid {
    gap: 24px;
  }

  .login-hero__highlights {
    grid-template-columns: 1fr;
  }

  .login-hero h1 {
    font-size: 34px;
  }

  .login-panel {
    padding: 24px 20px;
  }
}
</style>
