import React, { useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import 'katex/dist/katex.min.css';
import RemarkMath from 'remark-math'; // Math syntax
import RemarkBreaks from 'remark-breaks'; // Line break
import RehypeKatex from 'rehype-katex'; // Math render
import RemarkGfm from 'remark-gfm'; // Special markdown syntax
import RehypeExternalLinks from 'rehype-external-links';

import styles from './index.module.scss';
import dynamic from 'next/dynamic';

import { Link, Button, Text, Box, Flex, useTheme } from '@chakra-ui/react';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import { useTranslation } from 'next-i18next';
import { EventNameEnum, eventBus } from '@/web/common/utils/eventbus';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { MARKDOWN_QUOTE_SIGN } from '@fastgpt/global/core/chat/constants';
import { CodeClassNameEnum } from './utils';

import ChatBoxDivider from '../core/chat/Divider';
import { useToast } from '@fastgpt/web/hooks/useToast';

const CodeLight = dynamic(() => import('./CodeLight'), { ssr: false });
const MermaidCodeBlock = dynamic(() => import('./img/MermaidCodeBlock'), { ssr: false });
const MdImage = dynamic(() => import('./img/Image'), { ssr: false });
const EChartsCodeBlock = dynamic(() => import('./img/EChartsCodeBlock'), { ssr: false });
const IframeCodeBlock = dynamic(() => import('./codeBlock/Iframe'), { ssr: false });
const IframeHtmlCodeBlock = dynamic(() => import('./codeBlock/iframe-html'), { ssr: false });

const ChatGuide = dynamic(() => import('./chat/Guide'), { ssr: false });
const QuestionGuide = dynamic(() => import('./chat/QuestionGuide'), { ssr: false });

type Props = {
  source?: string;
  showAnimation?: boolean;
  isDisabled?: boolean;
  forbidZhFormat?: boolean;
};
const Markdown = (props: Props) => {
  const source = props.source || '';

  if (source.length < 200000) {
    return <MarkdownRender {...props} />;
  }

  return <Box whiteSpace={'pre-wrap'}>{source}</Box>;
};
const MarkdownRender = ({ source = '', showAnimation, isDisabled, forbidZhFormat }: Props) => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const theme = useTheme();

  const parseJsonSafe = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      return null;
    }
  };

  const extractAndParseActions = (source: string) => {
    const actionRegex = /SYSTEM_ACTION_BEGIN\|(.*?)\|SYSTEM_ACTION_END\n?/g;
    let match;
    const actions = [];
    let newSource = source;

    while ((match = actionRegex.exec(source)) !== null) {
      const jsonString = match[1];
      const parsedJson = parseJsonSafe(jsonString);
      if (parsedJson) {
        actions.push(parsedJson);
      }
      // Remove the matched part from the source including the trailing newline
      newSource = newSource.replace(match[0], '');
    }

    return { actions, newSource };
  };

  const extractAndParseGuessYouWantActions = (source: string) => {
    const actionRegex = /SYSTEM_GUESS_YOU_WANT_BEGIN\|(.*?)\|SYSTEM_GUESS_YOU_WANT_END\n?/g;
    let match;
    const guessYouWantActions = [];
    let newSource = source;

    while ((match = actionRegex.exec(source)) !== null) {
      const jsonString = match[1];
      const parsedJson = parseJsonSafe(jsonString);
      if (parsedJson) {
        guessYouWantActions.push(parsedJson);
      }
      // Remove the matched part from the source including the trailing newline
      newSource = newSource.replace(match[0], '');
    }

    return { guessYouWantActions, newSource };
  };

  // Example usage:
  var { actions, newSource } = extractAndParseActions(source);
  // You can now use `actions` as needed

  var { guessYouWantActions, newSource } = extractAndParseGuessYouWantActions(newSource);

  const handleClick = (action: any, index: number) => {
    // 在这里处理点击事件，可以根据 action 对象和 index 参数进行操作
    let noAction = true;

    if (action['ACTION']) {
      if (action['ACTION'] === 'OPEN_NEW_WINDOW' && action['URL']) {
        noAction = false;
        window.open(action['URL'], '_blank'); // 打开新窗口
        return;
      }
    }

    if (!noAction) {
      toast({
        status: 'warning',
        title: t('common:core.chat.Quick Command No Action')
      });
    }
  };

  const components = useMemo<any>(
    () => ({
      img: Image,
      pre: RewritePre,
      code: Code,
      a: A
    }),
    []
  );

  const formatSource = useMemo(() => {
    if (showAnimation || forbidZhFormat) return source;

    // 保护 URL 格式：https://, http://, /api/xxx
    const urlPlaceholders: string[] = [];
    const textWithProtectedUrls = source.replace(
      /(https?:\/\/[^\s<]+[^<.,:;"')\]\s]|\/api\/[^\s]+)(?=\s|$)/g,
      (match) => {
        urlPlaceholders.push(match);
        return `__URL_${urlPlaceholders.length - 1}__`;
      }
    );

    // 处理中文与英文数字之间的分词
    const textWithSpaces = textWithProtectedUrls
      .replace(
        /([\u4e00-\u9fa5\u3000-\u303f])([a-zA-Z0-9])|([a-zA-Z0-9])([\u4e00-\u9fa5\u3000-\u303f])/g,
        '$1$3 $2$4'
      )
      // 处理引用标记
      .replace(/\n*(\[QUOTE SIGN\]\(.*\))/g, '$1');

    // 还原 URL
    const finalText = textWithSpaces.replace(
      /__URL_(\d+)__/g,
      (_, index) => urlPlaceholders[parseInt(index)]
    );

    return finalText;
  }, [forbidZhFormat, showAnimation, source]);

  const urlTransform = useCallback((val: string) => {
    return val;
  }, []);

  return (
    <>
      <ReactMarkdown
        className={`markdown ${styles.markdown}
      ${showAnimation ? `${formatSource ? styles.waitingAnimation : styles.animation}` : ''}
    `}
        remarkPlugins={[RemarkMath, [RemarkGfm, { singleTilde: false }], RemarkBreaks]}
        rehypePlugins={[RehypeKatex, [RehypeExternalLinks, { target: '_blank' }]]}
        components={components}
      >
        {formatSource}
      </ReactMarkdown>

      {actions.length > 0 && (
        <Box mt={2}>
          <ChatBoxDivider
            icon="core/chat/quickCommand"
            text={t('common:core.chat.Quick Command')}
          />
          <Flex alignItems={'center'} flexWrap={'wrap'} gap={2}>
            {actions.map((action, index) => (
              <Flex
                key={action.text}
                alignItems={'center'}
                flexWrap={'wrap'}
                fontSize={'xs'}
                border={theme.borders.sm}
                py={'1px'}
                px={3}
                borderRadius={'md'}
                _hover={{
                  backgroundColor: 'gray.100' // 你可以根据需要调整颜色
                }}
                overflow={'hidden'}
                position={'relative'}
                cursor="pointer"
                onClick={() => handleClick(action, index)}
              >
                <Box className="textEllipsis" flex={'1 0 0'}>
                  {action['TEXT']}
                </Box>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}

      {guessYouWantActions.length > 0 && (
        <Box mt={2}>
          <ChatBoxDivider
            icon="core/chat/guessYouWant"
            text={t('common:core.chat.Guess You Want')}
          />
          <Flex alignItems={'center'} flexWrap={'wrap'} gap={2}>
            {guessYouWantActions.map((action, index) => (
              <Flex
                key={action.text}
                alignItems={'center'}
                flexWrap={'wrap'}
                fontSize={'xs'}
                border={theme.borders.sm}
                py={'1px'}
                px={3}
                borderRadius={'md'}
                _hover={{
                  '.controller': {
                    display: 'flex'
                  }
                }}
                overflow={'hidden'}
                position={'relative'}
              >
                <Box className="textEllipsis" flex={'1 0 0'}>
                  {action['TEXT']}
                </Box>
                <Box
                  className="controller"
                  display={'none'}
                  pr={2}
                  position={'absolute'}
                  right={0}
                  left={0}
                  justifyContent={'flex-end'}
                  alignItems={'center'}
                  h={'100%'}
                  lineHeight={0}
                  bg={`linear-gradient(to left, white,white min(60px,100%),rgba(255,255,255,0) 80%)`}
                >
                  <MyTooltip label={t('common:core.chat.markdown.Edit Question')}>
                    <MyIcon
                      name={'edit'}
                      w={'14px'}
                      cursor={'pointer'}
                      _hover={{
                        color: 'green.600'
                      }}
                      onClick={() =>
                        eventBus.emit(EventNameEnum.editQuestion, { text: action['TEXT'] })
                      }
                    />
                  </MyTooltip>
                  <MyTooltip label={t('common:core.chat.markdown.Send Question')}>
                    <MyIcon
                      ml={4}
                      name={'core/chat/sendLight'}
                      w={'14px'}
                      cursor={'pointer'}
                      _hover={{ color: 'primary.500' }}
                      onClick={() =>
                        eventBus.emit(EventNameEnum.sendQuestion, { text: action['TEXT'] })
                      }
                    />
                  </MyTooltip>
                </Box>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}
    </>
  );
};

export default React.memo(Markdown);

/* Custom dom */
function Code(e: any) {
  const { className, codeBlock, children } = e;
  const match = /language-(\w+)/.exec(className || '');
  const codeType = match?.[1];

  const strChildren = String(children);

  const Component = useMemo(() => {
    if (codeType === CodeClassNameEnum.mermaid) {
      return <MermaidCodeBlock code={strChildren} />;
    }
    if (codeType === CodeClassNameEnum.guide) {
      return <ChatGuide text={strChildren} />;
    }
    if (codeType === CodeClassNameEnum.questionGuide) {
      return <QuestionGuide text={strChildren} />;
    }
    if (codeType === CodeClassNameEnum.echarts) {
      return <EChartsCodeBlock code={strChildren} />;
    }
    if (codeType === CodeClassNameEnum.iframe) {
      return <IframeCodeBlock code={strChildren} />;
    }
    if (codeType && codeType.toLowerCase() === CodeClassNameEnum.html) {
      return (
        <IframeHtmlCodeBlock className={className} codeBlock={codeBlock} match={match}>
          {children}
        </IframeHtmlCodeBlock>
      );
    }

    return (
      <CodeLight className={className} codeBlock={codeBlock} match={match}>
        {children}
      </CodeLight>
    );
  }, [codeType, className, codeBlock, match, children, strChildren]);

  return Component;
}

function Image({ src }: { src?: string }) {
  return <MdImage src={src} />;
}

function A({ children, ...props }: any) {
  const { t } = useTranslation();

  // empty href link
  if (!props.href && typeof children?.[0] === 'string') {
    const text = useMemo(() => String(children), [children]);

    return (
      <MyTooltip label={t('common:core.chat.markdown.Quick Question')}>
        <Button
          variant={'whitePrimary'}
          size={'xs'}
          borderRadius={'md'}
          my={1}
          onClick={() => eventBus.emit(EventNameEnum.sendQuestion, { text })}
        >
          {text}
        </Button>
      </MyTooltip>
    );
  }

  // quote link(未使用)
  if (children?.length === 1 && typeof children?.[0] === 'string') {
    const text = String(children);
    if (text === MARKDOWN_QUOTE_SIGN && props.href) {
      return (
        <MyTooltip label={props.href}>
          <MyIcon
            name={'core/chat/quoteSign'}
            transform={'translateY(-2px)'}
            w={'18px'}
            color={'primary.500'}
            cursor={'pointer'}
            _hover={{
              color: 'primary.700'
            }}
            // onClick={() => getCollectionSourceAndOpen(props.href)}
          />
        </MyTooltip>
      );
    }
  }

  return <Link {...props}>{children}</Link>;
}

function RewritePre({ children }: any) {
  const modifiedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      // @ts-ignore
      return React.cloneElement(child, { codeBlock: true });
    }
    return child;
  });

  return <>{modifiedChildren}</>;
}
