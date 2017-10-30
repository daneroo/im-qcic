import { withTheme } from 'material-ui/styles';
import RemoveRedEye from 'material-ui-icons/RemoveRedEye';

const ThemeJSON = props => {
  const { theme } = props
  return (
    <pre>{JSON.stringify(theme, null, 2)}</pre> 
  )
}
export default withTheme()(ThemeJSON);

