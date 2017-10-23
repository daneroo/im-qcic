export default ({ children }) => (
  <main>
    {children}
    <style jsx global>{`
      * {
        font-family: 'Roboto', sans-serif;
        // font-family: 'Roboto Mono', monospace;
        // font-family: Menlo, Monaco, "Lucida Console", "Liberation Mono", "DejaVu Sans Mono", "Bitstream Vera Sans Mono", "Courier New", monospace, serif;
      }
      body {
        margin: 0;
        padding: 25px 50px;
      }
      a {
        // color: #22BAD9;
        // color: #999999;
        color: #067df7;
        text-decoration:  none;        
      }
      a:hover {
        color: #000000
      }
      p {
        // color: #888888;
        color: #666666;
        font-size: 14px;
        line-height: 24px;
      }
      article {
        margin: 0 auto;
        max-width: 650px;
      }
    `}</style>
  </main>
)
