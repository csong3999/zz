// 使用立即执行函数避免全局变量污染
(function() {
    let chartInstance = null;
    let monthlyChartInstance = null;
    
    // DOM 加载完成后初始化
    document.addEventListener('DOMContentLoaded', initialize);
    
    function initialize() {
        setCurrentDate();
        setupEventListeners();
        loadChart();
        loadMonthlyChart();
    }
    
    function setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('date');
        dateInput.value = today;
        // 设置最大日期为今天，防止选择未来日期
        dateInput.max = today;
        // 设置最小日期为一年前
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);
        dateInput.min = lastYear.toISOString().split('T')[0];
    }
    
    function setupEventListeners() {
        const saveButton = document.getElementById('saveButton');
        const resetButton = document.getElementById('resetButton');
        const modifyButton = document.getElementById('modifyButton');
        const shipmentInput = document.getElementById('shipmentCount');
        const dateInput = document.getElementById('date');
        
        // 添加回车键保存功能
        shipmentInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                saveData();
            }
        });
        
        // 保存按钮事件监听
        saveButton.addEventListener('click', saveData);
        
        // 添加修正按钮事件监听
        modifyButton.addEventListener('click', modifyData);
        
        // 修改日期变更事件监听
        dateInput.addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const today = new Date();
            
            // 如果选择的日期大于今天，重置为今天
            if (selectedDate > today) {
                this.value = today.toISOString().split('T')[0];
                showNotification('不能选择未来日期！', 'error');
                return;
            }
            
            // 检查选择的日期是否已有数据
            const shipmentData = JSON.parse(localStorage.getItem('shipmentData') || '{}');
            if (shipmentData[this.value]) {
                shipmentInput.value = shipmentData[this.value];
                showNotification('已加载该日期的数据，可以直接修改', 'info');
                modifyButton.disabled = false;
            } else {
                shipmentInput.value = '';
                modifyButton.disabled = true;
            }
        });
        
        // 添加重置按钮事件监听
        resetButton.addEventListener('click', confirmReset);
        
        // 添加导出按钮事件监听
        const exportButton = document.getElementById('exportButton');
        exportButton.addEventListener('click', exportToExcel);
    }
    
    // 添加确认重置函数
    function confirmReset() {
        const password = prompt('请输入重置密码：');
        if (password === '8179666') {
            if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
                resetAllData();
            }
        } else if (password !== null) { // 用户点击取消时 password 为 null
            showNotification('密码错误！', 'error');
        }
    }
    
    // 添加重置数据函数
    function resetAllData() {
        try {
            // 清空本地存储的数据
            localStorage.removeItem('shipmentData');
            
            // 重置输入框
            document.getElementById('shipmentCount').value = '';
            
            // 重新加载图表
            loadChart();
            loadMonthlyChart();
            
            showNotification('所有数据已重置！');
        } catch (error) {
            console.error('重置数据时出错：', error);
            alert('重置失败，请重试！');
        }
    }
    
    function saveData() {
        const date = document.getElementById('date').value;
        const shipmentInput = document.getElementById('shipmentCount');
        const count = shipmentInput.value;
        
        if (!count) {
            alert('请输入发货数量！');
            return;
        }
        
        try {
            const shipmentData = JSON.parse(localStorage.getItem('shipmentData') || '{}');
            
            // 直接更新数据，移除 lastOperation 相关代码
            shipmentData[date] = parseInt(count);
            localStorage.setItem('shipmentData', JSON.stringify(shipmentData));
            
            // 清空输入框并更新图表
            shipmentInput.value = '';
            loadChart();
            loadMonthlyChart();
            
            showNotification('保存成功！');
        } catch (error) {
            console.error('保存数据时出错：', error);
            alert('保存失败，请重试！');
        }
    }
    
    // 添加修改数据函数
    function modifyData() {
        const date = document.getElementById('date').value;
        const shipmentInput = document.getElementById('shipmentCount');
        const count = shipmentInput.value;
        
        if (!count) {
            showNotification('请输入发货数量！', 'error');
            return;
        }
        
        try {
            const shipmentData = JSON.parse(localStorage.getItem('shipmentData') || '{}');
            
            // 检查是否真的有修改
            if (shipmentData[date] === parseInt(count)) {
                showNotification('数据没有变化', 'info');
                return;
            }
            
            // 确认修改
            if (confirm(`确定要将 ${date} 的发货数量从 ${shipmentData[date]} 修改为 ${count} 吗？`)) {
                // 更新数据
                shipmentData[date] = parseInt(count);
                localStorage.setItem('shipmentData', JSON.stringify(shipmentData));
                
                // 清空输入框并更新图表
                shipmentInput.value = '';
                loadChart();
                loadMonthlyChart();
                
                showNotification('数据修改成功！');
            }
        } catch (error) {
            console.error('修改数据时出错：', error);
            showNotification('修改失败，请重试！', 'error');
        }
    }
    
    // 修改 showNotification 函数以支持信息类型的通知
    function showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // 2秒后自动消失
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }
    
    function loadChart() {
        const shipmentData = JSON.parse(localStorage.getItem('shipmentData') || '{}');
        const dates = Object.keys(shipmentData).sort();
        const counts = dates.map(date => shipmentData[date]);
        
        const ctx = document.getElementById('shipmentChart').getContext('2d');
        
        // 销毁旧图表
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        // 修改渐变颜色为橙色系
        const gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(255, 159, 64, 0.5)'); // 亮橙色半透明
        gradient.addColorStop(1, 'rgba(255, 159, 64, 0.0)'); // 完全透明
        
        // 使用 requestAnimationFrame 优化渲染
        requestAnimationFrame(() => {
            chartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: dates,
                    datasets: [{
                        label: '每日发货数量',
                        data: counts,
                        borderColor: 'rgb(255, 159, 64)', // 亮橙色线条
                        backgroundColor: gradient,
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: 'rgb(255, 159, 64)', // 数据点颜色
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 8,
                        pointHoverBackgroundColor: '#fff',
                        pointHoverBorderColor: 'rgb(255, 159, 64)', // 悬停边框颜色
                        pointHoverBorderWidth: 3
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            left: 10,
                            right: 10,
                            top: 10,
                            bottom: 10  // 增加底部内边距
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: {
                                color: 'rgba(255, 255, 255, 0.1)'
                            },
                            ticks: {
                                color: '#adb5bd',
                                padding: 10  // 增加刻度标签的内边距
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            },
                            ticks: {
                                color: '#adb5bd',
                                padding: 10,  // 增加刻度标签的内边距
                                maxRotation: 0,  // 防止标签旋转
                                autoSkip: true,  // 自动跳过重叠的标签
                                maxTicksLimit: 10  // 限制显示的标签数量
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: {
                                color: '#e9ecef',
                                font: {
                                    size: 14
                                },
                                padding: 20  // 增加图例的内边距
                            }
                        },
                        tooltip: {
                            backgroundColor: 'rgba(43, 45, 49, 0.9)',
                            titleColor: '#e9ecef',
                            bodyColor: '#e9ecef',
                            borderColor: '#40444b',
                            borderWidth: 1,
                            padding: 12
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
        });
    }
    
    function loadMonthlyChart() {
        const shipmentData = JSON.parse(localStorage.getItem('shipmentData') || '{}');
        const monthlyData = calculateMonthlyData(shipmentData);
        
        const ctx = document.getElementById('monthlyChart').getContext('2d');
        
        if (monthlyChartInstance) {
            monthlyChartInstance.destroy();
        }
        
        monthlyChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
                datasets: [{
                    label: '月度发货总量',
                    data: monthlyData,
                    backgroundColor: 'rgba(255, 159, 64, 0.7)',
                    borderColor: 'rgb(255, 159, 64)',
                    borderWidth: 1
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        left: 10,
                        right: 20,  // 增加右侧内边距
                        top: 10,
                        bottom: 10
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: '#adb5bd',
                            padding: 8
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: '#adb5bd',
                            padding: 8
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(43, 45, 49, 0.9)',
                        titleColor: '#e9ecef',
                        bodyColor: '#e9ecef',
                        borderColor: '#40444b',
                        borderWidth: 1,
                        padding: 12
                    }
                }
            }
        });
    }
    
    function calculateMonthlyData(shipmentData) {
        const monthlyTotals = new Array(12).fill(0);
        
        Object.entries(shipmentData).forEach(([date, count]) => {
            const [year, month] = date.split('-');
            if (year === '2025') {
                const monthIndex = parseInt(month) - 1;
                monthlyTotals[monthIndex] += count;
            }
        });
        
        return monthlyTotals;
    }
    
    // 添加导出功能
    function exportToExcel() {
        try {
            const shipmentData = JSON.parse(localStorage.getItem('shipmentData') || '{}');
            const monthlyData = calculateMonthlyData(shipmentData);
            
            // 创建工作簿
            const wb = XLSX.utils.book_new();
            
            // 准备日数据
            const dailyRows = Object.entries(shipmentData)
                .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
                .map(([date, count]) => ({
                    '日期': date,
                    '发货数量': count
                }));
            
            // 准备月度数据
            const monthlyRows = monthlyData.map((count, index) => ({
                '月份': `${index + 1}月`,
                '发货总量': count
            }));
            
            // 创建日数据工作表
            const dailyWs = XLSX.utils.json_to_sheet(dailyRows);
            XLSX.utils.book_append_sheet(wb, dailyWs, '每日发货数据');
            
            // 创建月度数据工作表
            const monthlyWs = XLSX.utils.json_to_sheet(monthlyRows);
            XLSX.utils.book_append_sheet(wb, monthlyWs, '月度统计数据');
            
            // 设置列宽
            const wscols = [
                {wch: 15}, // 日期列宽
                {wch: 12}  // 数量列宽
            ];
            dailyWs['!cols'] = wscols;
            monthlyWs['!cols'] = wscols;
            
            // 导出文件
            const fileName = `京东快递发货统计_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(wb, fileName);
            
            showNotification('数据导出成功！');
        } catch (error) {
            console.error('导出数据时出错：', error);
            showNotification('导出失败，请重试！', 'error');
        }
    }
})(); 