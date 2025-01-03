import { config } from "./config";
export function getServerUrl() {
    return config.BASE_URL;
}

export const openLink = (url: string) => {
  window.open(url, '_blank')?.focus();
};

export const logoutAndRedirect = () => {
  localStorage.removeItem('user')
  config.BOUND_DEVICES = [];
  config.SUB_ACCOUNTS = [];
};