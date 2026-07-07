import { describe, expect, it } from 'vitest';
import { preprocessHtml } from './html';

const SAMPLE = `<html>
<head><title>Careers</title><style>.a { color: red; }</style></head>
<body>
<script>var secret = "should-not-appear";</script>
<!-- hidden comment -->
<h1>채용 공고</h1>
<ul>
  <li><a href="/jobs/1">Frontend Engineer &amp; Web</a></li>
  <li><a href='https://x.com/2'><span>Backend</span> Engineer</a></li>
  <li><a href="#top">맨 위로</a></li>
  <li><a href="javascript:void(0)">지원하기</a></li>
  <li><a href="/jobs/3"></a></li>
</ul>
<p>재지원은 6개월 이후 가능합니다.</p>
</body></html>`;

describe('preprocessHtml', () => {
  it('script/style/주석을 제거한다', () => {
    const { text } = preprocessHtml(SAMPLE);
    expect(text).not.toContain('should-not-appear');
    expect(text).not.toContain('color: red');
    expect(text).not.toContain('hidden comment');
  });

  it('본문 텍스트를 추출한다', () => {
    const { text } = preprocessHtml(SAMPLE);
    expect(text).toContain('채용 공고');
    expect(text).toContain('재지원은 6개월 이후 가능합니다.');
  });

  it('앵커를 { text, href }로 추출하고 내부 태그·엔티티를 정리한다', () => {
    const { links } = preprocessHtml(SAMPLE);
    expect(links).toEqual([
      { text: 'Frontend Engineer & Web', href: '/jobs/1' },
      { text: 'Backend Engineer', href: 'https://x.com/2' },
    ]);
  });

  it('프래그먼트/javascript/빈 앵커는 제외한다', () => {
    const { links } = preprocessHtml(SAMPLE);
    const hrefs = links.map((l) => l.href);
    expect(hrefs).not.toContain('#top');
    expect(hrefs).not.toContain('javascript:void(0)');
    expect(hrefs).not.toContain('/jobs/3');
  });

  it('HTML 엔티티를 디코딩한다', () => {
    const { text } = preprocessHtml('<p>A &lt; B &#38; C &#x41;&nbsp;end</p>');
    expect(text).toBe('A < B & C A end');
  });

  it('블록 요소 경계를 줄바꿈으로 유지하고 빈 줄을 제거한다', () => {
    const { text } = preprocessHtml('<div>첫 줄</div><div></div><p>둘째 줄</p>');
    expect(text).toBe('첫 줄\n둘째 줄');
  });
});
