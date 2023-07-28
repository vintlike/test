import { il8n } from '@/locales/intl';
import { AxiosResponse } from '@umijs/max';
import { getLocale } from '@umijs/max';
import { RequestConfig } from '@umijs/max';
import { message } from 'antd';
import { Codes } from './index';

function isLoginRedirect() {
  return window.location.pathname.includes(Codes.LoginRedirect);
}

const showMsg = (response: AxiosResponse<any>): string => {
  const { retcode = 0, message, enMessage } = response?.data ?? {};
  let errorMsg = '';

  // 注意：不遵循Res类型规范，所以这里需要考虑兼容~~
  if (retcode !== 0) {
    errorMsg =
      retcode === 10000
        ? il8n({ id: 'msg.serverError' })
        : getLocale() === 'en-US'
        ? enMessage
        : message || il8n({ id: 'msg.networkError' });
  }

  return errorMsg;
};

/** 运行时配置-request */
export const request: RequestConfig = {
  timeout: 1000 * 60 * 1, // 一分钟
  // other axios options you want
  errorConfig: {
    errorHandler() {
      // do something.
    },
    errorThrower() {
      // do something.
    },
  },
  requestInterceptors: [
    // 直接写一个 function，作为拦截器
    (url, options) => {
      // Do something before request is sent
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get('token');

      options.params = Object.assign({}, options.params, { token });
      options.headers['X-Requested-With'] = 'XMLHttpRequest';
      options.withCredentials = true;

      return { url, options };
    },
    // 一个二元组，第一个元素是 request 拦截器，第二个元素是错误处理
    [
      (url, options) => {
        return { url, options };
      },
      (error: any) => {
        return Promise.reject(error);
      },
    ],
    // 数组，省略错误处理
    [
      (url, options) => {
        return { url, options };
      },
    ],
  ],
  responseInterceptors: [
    // 直接写一个 function，作为拦截器
    (response) => {
      // 不再需要异步处理读取返回体内容，可直接在data中读出，部分字段可在 config 中找到

      const err = showMsg(response);

      if (err && !isLoginRedirect()) {
        message.warning(err);
      }
      // do something
      return response;
    },
    // 一个二元组，第一个元素是 request 拦截器，第二个元素是错误处理
    [
      (response: any) => {
        // Do something with response data
        const { retcode, message, redirect } = response.data ?? {};

        if (retcode === 'not_login' && redirect) {
          window.location.href = redirect;

          return;
        }

        if (retcode === 4006) {
          const { pathname, origin, search, protocol } = window.location;

          /**
            callback格式说明：
            1、url路径上直接带"#/"或"#!/"会不支持，需要用encodeURIComponent转译一下；
            2、参数中不支持特殊符号点 .（符号点会导致域名解析出错） 这个用encodeURIComponent转译不了，得替换成其他符号一下；
          */

          const tmpSearch = search.replace(/\./g, '(');

          const pathSearch = tmpSearch
            ? `${tmpSearch}&_path=${pathname}`
            : `?_path=${pathname}`;

          const reg = /^http(s)?:\/\/v-ins(-pre)?.com.cn/;
          const vinsUrl = `${origin}/pdata/dev-login${pathSearch}`; // v行业对外域名
          const devLoginUrl = `${protocol}//com.cn/`; // 游戏开放平台 首页

          const callbackUrl = reg.test(origin)
            ? encodeURIComponent(vinsUrl)
            : devLoginUrl;


          // 跳转到 LoginRedirect 登录中转站，然后解析 search 参数再重定向回原来的页面
          const newHref = `${protocol}//.com.cn/?callback=${callbackUrl}&_${+new Date()}#!/access/login`;

          window.location.href = newHref;

          return Promise.reject(message);
        }

        // if (retcode === 'not_login') {
        //   window.location.href = redirect;
        // }
        else if (retcode === 4005 || retcode === 'not_login') {
          const { pathname, origin, search, protocol } = window.location;

          const tmpSearch = search.replace(/\./g, '(');

          const pathSearch = tmpSearch
            ? `${tmpSearch}&_path=${pathname}`
            : `?_path=${pathname}`;

          // console.log(message, 'x');

          const reg = /^http(s)?:\/\/v-industry(-pre|-dev)?.vmic.xyz/;
          const vinsUrl = `${origin}/pdata${Codes.LoginRedirect}${pathSearch}`; // v行业对外域名
          const devLoginUrl = `${origin}/pdata`; // 游戏开放平台 首页

          const callbackUrl =
            process.env.NODE_ENV === 'development' || reg.test(origin)
              ? encodeURIComponent(vinsUrl)
              : devLoginUrl;


          const newHref = `${protocol}//LoginPage.aspx?RequestUrl=${callbackUrl}`;

          // console.log('newHref', newHref);

          if (!isLoginRedirect()) {
            window.location.href = newHref;

            return;
          }
        }

        return response;
      },
      (error: any) => {
        return Promise.reject(error);
      },
    ],
    // 数组，省略错误处理
    [
      (response) => {
        return response;
      },
    ],
  ],
};
