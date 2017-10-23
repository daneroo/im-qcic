import React from 'react';
import Table, { TableBody, TableCell, TableHead, TableRow } from 'material-ui/Table';
import Paper from 'material-ui/Paper';

/**
 * A simple table demonstrating the hierarchy of the `Table` component and its sub-components.
 */
const BasicTable = () => (
  <Paper style={{ margin: 40 }} elevation={12} >
    <Table>
      <TableHead>
        <TableRow>
          <TableCell>id</TableCell>
          <TableCell numeric>Stamp</TableCell>
          <TableCell numeric>Host</TableCell>
          <TableCell numeric>Text</TableCell>
          <TableCell numeric> Δ Origin (ms)</TableCell>
          <TableCell numeric> Δ Server (ms)</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {data().messages.map(m => {
          return (
            <TableRow key={m.id}>
              <TableCell>{m.id.slice(-5)}</TableCell>
              <TableCell numeric>{m.stamp}</TableCell>
              <TableCell numeric>{m.host}</TableCell>
              <TableCell numeric>{m.text}</TableCell>
              <TableCell numeric>{m.delta}</TableCell>
              <TableCell numeric>{m.deltaServer}</TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  </Paper>
);

export default BasicTable;

function data() {
  return {
    "messages": [
      {
        "id": "01BX334GNYEW2ZPBW1DQRGJWQN",
        "stamp": "2017-10-22T22:26:59.902Z",
        "host": "api",
        "text": "hello"
      },
      {
        "id": "01BX334TEM1EK0A7DWT9FM1QQJ",
        "stamp": "2017-10-22T22:27:09.908Z",
        "host": "api",
        "text": "hello"
      },
      {
        "id": "01BX33547EKYTRBP580CRHP0Z0",
        "stamp": "2017-10-22T22:27:19.919Z",
        "host": "api",
        "text": "hello"
      },
      {
        "id": "01BX335E09Z2WP306A5BG9AT5D",
        "stamp": "2017-10-22T22:27:29.929Z",
        "host": "api",
        "text": "hello"
      },
      {
        "id": "01BX335QS3XRC9K65KRETC9E6T",
        "stamp": "2017-10-22T22:27:39.939Z",
        "host": "api",
        "text": "hello"
      },
      {
        "id": "01BX3361HXMTTD4GG7BD813RNY",
        "stamp": "2017-10-22T22:27:49.951Z",
        "host": "api",
        "text": "hello"
      },
      {
        "id": "01BX336BAEVFAS755CJCW2TF1M",
        "stamp": "2017-10-22T22:27:59.950Z",
        "host": "api",
        "text": "hello"
      },
      {
        "id": "01BX336N389BXH711YJ0VGA7B0",
        "stamp": "2017-10-22T22:28:09.960Z",
        "host": "api",
        "text": "hello"
      },
      {
        "id": "01BX336YW282H5QZQ83ZFKF5D4",
        "stamp": "2017-10-22T22:28:19.970Z",
        "host": "api",
        "text": "hello"
      },
      {
        "id": "01BX3378MQHBHR2QBMNST5F7ZQ",
        "stamp": "2017-10-22T22:28:29.975Z",
        "host": "api",
        "text": "hello"
      }
    ]
  }
}