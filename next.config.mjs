export default {
  async redirects() {return [{source:'/',destination:'/play/index.html',permanent:false}];},
  async headers() {
    return [{source:'/play/:path*',headers:[
      {key:'Referrer-Policy',value:'no-referrer'},
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Content-Security-Policy',value:"default-src 'self'; img-src 'self' data: blob:; media-src 'self' data: blob:; connect-src 'self'; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"}
    ]}];
  }
};
