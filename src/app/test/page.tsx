/**
 * シンプルなテストページ
 * 
 * サーバーが正常に動作しているかテスト用
 */

export default function TestPage() {
  return (
    <div style={{ padding: '20px', backgroundColor: 'lightblue' }}>
      <h1>テストページ</h1>
      <p>このページが表示されればNext.jsサーバーは正常に動作しています。</p>
      <ul>
        <li>現在時刻: {new Date().toLocaleString()}</li>
        <li>ページパス: /test</li>
      </ul>
    </div>
  )
}