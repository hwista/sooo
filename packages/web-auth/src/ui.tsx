import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { KeyRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { LoginRequest } from '@ssoo/types/common';
import { Button, Input } from '@ssoo/web-ui';

export interface LoginValidationErrors {
  loginId?: string;
  password?: string;
  form?: string;
}

export interface AuthPageShellProps {
  children: ReactNode;
}

export interface AuthLoadingScreenProps {
  message?: string;
}

export interface AuthLoginCardProps {
  header: ReactNode;
  footer?: ReactNode;
  isLoading?: boolean;
  passwordLoginEnabled?: boolean;
  passwordResetHref?: string;
  registrationLink?: AuthLoginActionLink;
  identityProviders?: AuthIdentityProviderAction[];
  loginIdLabel?: string;
  passwordLabel?: string;
  loginIdPlaceholder?: string;
  passwordPlaceholder?: string;
  submitLabel?: string;
  loadingLabel?: string;
  onSubmit: (credentials: LoginRequest) => Promise<void>;
  validate?: (credentials: LoginRequest) => LoginValidationErrors;
}

export interface AuthStandardLoginCardProps {
  isLoading?: boolean;
  passwordLoginEnabled?: boolean;
  appName?: string;
  appDescription?: string;
  title?: string;
  passwordResetHref?: string;
  registrationLink?: AuthLoginActionLink;
  identityProviders?: AuthIdentityProviderAction[];
  onSubmit: (credentials: LoginRequest) => Promise<void>;
}

export interface AuthLoginActionLink {
  href: string;
  label: string;
  external?: boolean;
}

export interface AuthIdentityProviderAction {
  key: string;
  href: string;
  label: string;
  external?: boolean;
  icon?: LucideIcon;
}

function defaultValidate(credentials: LoginRequest): LoginValidationErrors {
  const errors: LoginValidationErrors = {};

  if (!credentials.loginId.trim()) {
    errors.loginId = '아이디를 입력하세요.';
  }

  if (!credentials.password.trim()) {
    errors.password = '비밀번호를 입력하세요.';
  }

  return errors;
}

function validateStandardLogin(credentials: LoginRequest): LoginValidationErrors {
  const errors: LoginValidationErrors = {};

  if (!credentials.loginId.trim()) {
    errors.loginId = '아이디를 입력하세요.';
  }

  if (!credentials.password.trim()) {
    errors.password = '비밀번호를 입력하세요.';
  } else if (credentials.password.length < 4) {
    errors.password = '비밀번호는 4자 이상이어야 합니다.';
  }

  return errors;
}

function AuthStandardLoginHeader({
  title = '로그인',
}: Pick<AuthStandardLoginCardProps, 'title'>) {
  return (
    <div className="text-center">
      <h1 className="text-5xl font-extrabold text-ssoo-primary">
        SSOT
      </h1>
      <h2 className="mt-6 text-2xl font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function isExternalHref(href: string) {
  return /^https?:\/\//.test(href) || href.startsWith('mailto:');
}

function actionLinkProps(link: AuthLoginActionLink | AuthIdentityProviderAction) {
  const external = link.external ?? isExternalHref(link.href);

  return external
    ? { target: '_blank', rel: 'noreferrer' }
    : {};
}

function AuthStandardLoginFooter() {
  return (
    <p className="text-center text-sm text-ssoo-primary/50">
      © 2026 SSOT
    </p>
  );
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <main className="min-h-screen bg-ssoo-background px-4 py-10 text-foreground">
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </main>
  );
}

export function AuthLoadingScreen({
  message = '로딩 중...',
}: AuthLoadingScreenProps) {
  return (
    <AuthPageShell>
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-ssoo-primary border-t-transparent" />
        <p className="text-ssoo-primary/70">{message}</p>
      </div>
    </AuthPageShell>
  );
}

export function AuthLoginCard({
  header,
  footer,
  isLoading = false,
  passwordLoginEnabled = true,
  passwordResetHref,
  registrationLink,
  identityProviders = [],
  loginIdLabel = '아이디',
  passwordLabel = '비밀번호',
  loginIdPlaceholder = '아이디를 입력하세요',
  passwordPlaceholder = '비밀번호를 입력하세요',
  submitLabel = '로그인',
  loadingLabel = '로그인 중...',
  onSubmit,
  validate,
}: AuthLoginCardProps) {
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginValidationErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const validateCredentials = useMemo(
    () => validate ?? defaultValidate,
    [validate],
  );

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    setFormError(null);
  }, [isLoading]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const credentials = {
      loginId: loginId.trim(),
      password,
    };
    const nextErrors = validateCredentials(credentials);

    setFieldErrors(nextErrors);
    if (nextErrors.loginId || nextErrors.password || nextErrors.form) {
      setFormError(nextErrors.form ?? null);
      return;
    }

    try {
      await onSubmit(credentials);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    }
  };

  return (
    <div className="rounded-lg border border-ssoo-content-border bg-card p-8 text-card-foreground shadow-sm">
      <div className="mb-7">{header}</div>

      {passwordLoginEnabled ? (
        <form className="space-y-5" onSubmit={handleSubmit}>
          {formError && (
            <div className="rounded-md border px-4 py-3 text-sm ssoo-tone-danger-surface">
              {formError}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground" htmlFor="loginId">
              {loginIdLabel}
            </label>
            <Input
              id="loginId"
              type="text"
              autoComplete="username"
              value={loginId}
              onChange={(event) => setLoginId(event.target.value)}
              className="h-11"
              placeholder={loginIdPlaceholder}
            />
            {fieldErrors.loginId && (
              <p className="text-sm ssoo-tone-danger">{fieldErrors.loginId}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-foreground" htmlFor="password">
                {passwordLabel}
              </label>
              {passwordResetHref ? (
                <a
                  href={passwordResetHref}
                  className="text-sm font-medium text-ssoo-primary underline-offset-4 transition-colors hover:text-ssoo-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ssoo-primary/20"
                  {...actionLinkProps({ href: passwordResetHref, label: '비밀번호 찾기' })}
                >
                  비밀번호 찾기
                </a>
              ) : null}
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11"
              placeholder={passwordPlaceholder}
            />
            {fieldErrors.password && (
              <p className="text-sm ssoo-tone-danger">{fieldErrors.password}</p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="h-11 w-full cursor-pointer"
          >
            {isLoading ? loadingLabel : submitLabel}
          </Button>
        </form>
      ) : null}

      {identityProviders.length > 0 ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-ssoo-content-border" />
            <span className="text-xs font-medium text-ssoo-primary/60">또는</span>
            <span className="h-px flex-1 bg-ssoo-content-border" />
          </div>
          <div className="grid gap-2">
            {identityProviders.map((provider) => {
              const Icon = provider.icon ?? KeyRound;

              return (
                <Button key={provider.key} asChild variant="outline" className="h-11 w-full">
                  <a
                    href={provider.href}
                    {...actionLinkProps(provider)}
                  >
                    <Icon aria-hidden className="h-4 w-4 text-ssoo-primary/70" />
                    {provider.label}
                  </a>
                </Button>
              );
            })}
          </div>
        </div>
      ) : null}

      {registrationLink ? (
        <div className="mt-5 rounded-md bg-ssoo-content-bg/40 px-4 py-3 text-center text-sm text-ssoo-primary/75">
          계정이 필요하신가요?
          {' '}
          <a
            href={registrationLink.href}
            className="font-medium text-ssoo-primary underline-offset-4 transition-colors hover:text-ssoo-primary-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ssoo-primary/20"
            {...actionLinkProps(registrationLink)}
          >
            {registrationLink.label}
          </a>
        </div>
      ) : null}

      {footer ? (
        <div className="mt-6">
          {footer}
        </div>
      ) : null}
    </div>
  );
}

export function AuthStandardLoginCard({
  isLoading = false,
  passwordLoginEnabled = true,
  title,
  passwordResetHref,
  registrationLink,
  identityProviders,
  onSubmit,
}: AuthStandardLoginCardProps) {
  return (
    <AuthLoginCard
      header={(
        <AuthStandardLoginHeader
          title={title}
        />
      )}
      footer={<AuthStandardLoginFooter />}
      isLoading={isLoading}
      passwordLoginEnabled={passwordLoginEnabled}
      passwordResetHref={passwordResetHref}
      registrationLink={registrationLink}
      identityProviders={identityProviders}
      onSubmit={onSubmit}
      validate={validateStandardLogin}
    />
  );
}
