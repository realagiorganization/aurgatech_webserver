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

export const isValidEmail = (email: string) => {
  return /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(email);
};