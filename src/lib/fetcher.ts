/**
 * SWR用のfetcher関数
 *
 * SWRは「データを取得する方法」を知らないので、
 * この関数で「fetchを使ってAPIからデータを取得する」ことを教える
 *
 * 使い方:
 * const { data } = useSWR('/api/dashboard', fetcher);
 */
export const fetcher = async (url: string) => {
  const response = await fetch(url);

  // エラーレスポンスの場合は例外を投げる
  if (!response.ok) {
    const error = new Error('データの取得に失敗しました');
    throw error;
  }

  // JSONをパースして返す
  return response.json();
};
