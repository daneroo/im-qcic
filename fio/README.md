# Fio Test - Kubestr

THis was from Lab #2 of [Kasten Learning](https://learning.kasten.io/kubernetes/labs/build-kubernetes-application/lessons/lab-2/#lab)

See also: 

- <https://github.com/axboe/fio/tree/master/examples>
- <https://kubestr.io/>

```bash
kubestr fio -f ssd-test.fio -s local-path

# or locally
fio -f ssd-test.fio
# just seq read and write
fio -f simple-rw.fio
```
